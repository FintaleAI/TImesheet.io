"use client";

import { useEffect, useReducer } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";
import { clearAccessToken } from "@/lib/auth";

type Employee = {
  id: number;
  employee_code: string;
  full_name: string;
  designation: string | null;
  qualification: string | null;
  contact_number: string | null;
  company_email: string | null;
  status: string;
  username: string | null;
  role: string | null;
};

type EmployeeForm = {
  full_name: string;
  qualification: string;
  designation: string;
  contact_number: string;
  company_email: string;
  address: string;
  username: string;
  temporary_password: string;
  status: string;
};

const initialForm: EmployeeForm = {
  full_name: "",
  qualification: "",
  designation: "",
  contact_number: "",
  company_email: "",
  address: "",
  username: "",
  temporary_password: "",
  status: "active",
};

type State = {
  employees: Employee[];
  form: EmployeeForm;
  editingEmployeeId: number | null;
  error: string | null;
  success: string | null;
  loading: boolean;
  submitting: boolean;
  deletingEmployeeId: number | null;
};

type Action =
  | { type: "LOAD_START" }
  | { type: "LOAD_SUCCESS"; employees: Employee[] }
  | { type: "LOAD_ERROR"; error: string }
  | { type: "SUBMIT_START" }
  | { type: "SUBMIT_SUCCESS"; message: string; employees: Employee[] }
  | { type: "SUBMIT_ERROR"; error: string }
  | { type: "UPDATE_FIELD"; key: keyof EmployeeForm; value: string }
  | { type: "START_EDIT"; employee: Employee }
  | { type: "CANCEL_EDIT" }
  | { type: "DELETE_START"; employeeId: number }
  | { type: "DELETE_DONE"; message: string; employees: Employee[] }
  | { type: "DELETE_ERROR"; error: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "LOAD_START":
      return { ...state, loading: true, error: null };
    case "LOAD_SUCCESS":
      return { ...state, loading: false, employees: action.employees };
    case "LOAD_ERROR":
      return { ...state, loading: false, error: action.error };
    case "SUBMIT_START":
      return { ...state, submitting: true, error: null, success: null };
    case "SUBMIT_SUCCESS":
      return {
        ...state,
        submitting: false,
        success: action.message,
        employees: action.employees,
        form: initialForm,
        editingEmployeeId: null,
      };
    case "SUBMIT_ERROR":
      return { ...state, submitting: false, error: action.error };
    case "UPDATE_FIELD":
      return { ...state, form: { ...state.form, [action.key]: action.value } };
    case "START_EDIT":
      return {
        ...state,
        editingEmployeeId: action.employee.id,
        error: null,
        success: null,
        form: {
          full_name: action.employee.full_name,
          qualification: action.employee.qualification ?? "",
          designation: action.employee.designation ?? "",
          contact_number: action.employee.contact_number ?? "",
          company_email: action.employee.company_email ?? "",
          address: "",
          username: action.employee.username ?? "",
          temporary_password: "",
          status: action.employee.status,
        },
      };
    case "CANCEL_EDIT":
      return {
        ...state,
        editingEmployeeId: null,
        form: initialForm,
        error: null,
        success: null,
      };
    case "DELETE_START":
      return {
        ...state,
        deletingEmployeeId: action.employeeId,
        error: null,
        success: null,
      };
    case "DELETE_DONE":
      return {
        ...state,
        deletingEmployeeId: null,
        success: action.message,
        employees: action.employees,
        editingEmployeeId:
          state.editingEmployeeId === action.employees.find((employee) => employee.id === state.editingEmployeeId)?.id
            ? state.editingEmployeeId
            : null,
        form:
          state.editingEmployeeId === null
            ? state.form
            : action.employees.some((employee) => employee.id === state.editingEmployeeId)
              ? state.form
              : initialForm,
      };
    case "DELETE_ERROR":
      return { ...state, deletingEmployeeId: null, error: action.error };
  }
}

const initialState: State = {
  employees: [],
  form: initialForm,
  editingEmployeeId: null,
  error: null,
  success: null,
  loading: true,
  submitting: false,
  deletingEmployeeId: null,
};

function buildEmployeePayload(form: EmployeeForm) {
  return {
    full_name: form.full_name,
    qualification: form.qualification || null,
    designation: form.designation || null,
    contact_number: form.contact_number || null,
    company_email: form.company_email || null,
    address: form.address || null,
    username: form.username,
    status: form.status,
  };
}

export function EmployeeMaster() {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, initialState);
  const {
    employees,
    form,
    editingEmployeeId,
    error,
    success,
    loading,
    submitting,
    deletingEmployeeId,
  } = state;

  async function loadEmployees() {
    dispatch({ type: "LOAD_START" });
    try {
      const currentUser = await apiRequest<{ must_change_password: boolean }>("/auth/me");
      if (currentUser.must_change_password) {
        router.replace("/change-password");
        return;
      }
      const result = await apiRequest<Employee[]>("/employees");
      dispatch({ type: "LOAD_SUCCESS", employees: result });
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Unable to load employees";
      dispatch({ type: "LOAD_ERROR", error: message });
      if (message.toLowerCase().includes("credentials")) {
        clearAccessToken();
        router.push("/");
      }
    }
  }

  useEffect(() => {
    void loadEmployees();
  }, []);

  async function onSubmit(event: { preventDefault(): void }) {
    event.preventDefault();
    dispatch({ type: "SUBMIT_START" });
    try {
      if (editingEmployeeId === null) {
        const created = await apiRequest<{ employee_code: string; username: string }>("/employees", {
          method: "POST",
          body: {
            ...buildEmployeePayload(form),
            temporary_password: form.temporary_password,
          },
        });
        const refreshed = await apiRequest<Employee[]>("/employees");
        dispatch({
          type: "SUBMIT_SUCCESS",
          message: `Employee ${created.employee_code} created with username ${created.username}.`,
          employees: refreshed,
        });
        return;
      }

      const updated = await apiRequest<{ employee_code: string; status: string }>(
        `/employees/${editingEmployeeId}`,
        {
          method: "PUT",
          body: buildEmployeePayload(form),
        },
      );
      const refreshed = await apiRequest<Employee[]>("/employees");
      dispatch({
        type: "SUBMIT_SUCCESS",
        message: `Employee ${updated.employee_code} updated successfully.`,
        employees: refreshed,
      });
    } catch (requestError) {
      dispatch({
        type: "SUBMIT_ERROR",
        error:
          requestError instanceof Error
            ? requestError.message
            : editingEmployeeId === null
              ? "Unable to create employee"
              : "Unable to update employee",
      });
    }
  }

  async function onDelete(employee: Employee) {
    dispatch({ type: "DELETE_START", employeeId: employee.id });
    try {
      await apiRequest<void>(`/employees/${employee.id}`, { method: "DELETE" });
      const refreshed = await apiRequest<Employee[]>("/employees");
      dispatch({
        type: "DELETE_DONE",
        message: `Employee ${employee.employee_code} deleted successfully.`,
        employees: refreshed,
      });
      if (editingEmployeeId === employee.id) {
        dispatch({ type: "CANCEL_EDIT" });
      }
    } catch (requestError) {
      dispatch({
        type: "DELETE_ERROR",
        error: requestError instanceof Error ? requestError.message : "Unable to delete employee",
      });
    }
  }

  function updateField(key: keyof EmployeeForm, value: string) {
    dispatch({ type: "UPDATE_FIELD", key, value });
  }

  return (
    <main className="shell">
      <section className="panel hero">
        <div className="helper">
          <div>
            <h1>Employee Master</h1>
            <p className="muted">
              Admins can create, revise, and retire employee profiles while keeping the
              first username/password identity in sync.
            </p>
          </div>
          <button className="button-primary" type="button" onClick={() => router.push("/dashboard")}>
            Back to dashboard
          </button>
        </div>

        <form className="employee-form" onSubmit={onSubmit}>
          <div className="input-group">
            <label htmlFor="full_name">Full name</label>
            <input
              id="full_name"
              value={form.full_name}
              onChange={(event) => updateField("full_name", event.target.value)}
            />
          </div>
          <div className="input-group">
            <label htmlFor="qualification">Qualification</label>
            <input
              id="qualification"
              value={form.qualification}
              onChange={(event) => updateField("qualification", event.target.value)}
            />
          </div>
          <div className="input-group">
            <label htmlFor="designation">Designation</label>
            <input
              id="designation"
              value={form.designation}
              onChange={(event) => updateField("designation", event.target.value)}
            />
          </div>
          <div className="input-group">
            <label htmlFor="contact_number">Contact number</label>
            <input
              id="contact_number"
              value={form.contact_number}
              onChange={(event) => updateField("contact_number", event.target.value)}
            />
          </div>
          <div className="input-group">
            <label htmlFor="company_email">Company email</label>
            <input
              id="company_email"
              value={form.company_email}
              onChange={(event) => updateField("company_email", event.target.value)}
              placeholder="Optional for now"
            />
          </div>
          <div className="input-group">
            <label htmlFor="address">Address</label>
            <input
              id="address"
              value={form.address}
              onChange={(event) => updateField("address", event.target.value)}
              placeholder={editingEmployeeId === null ? "" : "Address can be updated here"}
            />
          </div>
          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              value={form.username}
              onChange={(event) => updateField("username", event.target.value)}
            />
          </div>
          {editingEmployeeId === null ? (
            <div className="input-group">
              <label htmlFor="temporary_password">Temporary password</label>
              <input
                id="temporary_password"
                type="password"
                value={form.temporary_password}
                onChange={(event) => updateField("temporary_password", event.target.value)}
              />
            </div>
          ) : (
            <div className="input-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                value={form.status}
                onChange={(event) => updateField("status", event.target.value)}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          )}
          {error ? <p className="error-text">{error}</p> : null}
          {success ? <p className="success-text">{success}</p> : null}
          <div className="form-actions input-span-2">
            <button className="button-primary" type="submit" disabled={submitting}>
              {submitting
                ? editingEmployeeId === null
                  ? "Creating employee..."
                  : "Saving employee..."
                : editingEmployeeId === null
                  ? "Create employee"
                  : "Save employee"}
            </button>
            {editingEmployeeId !== null ? (
              <button
                className="button-secondary"
                type="button"
                onClick={() => dispatch({ type: "CANCEL_EDIT" })}
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>

        <div className="employee-table panel">
          <h2>Existing employees</h2>
          {loading ? <p className="muted">Loading employees...</p> : null}
          {!loading && employees.length === 0 ? (
            <p className="muted">No employees found yet.</p>
          ) : null}
          {!loading && employees.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Designation</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr key={employee.id}>
                      <td>{employee.employee_code}</td>
                      <td>{employee.full_name}</td>
                      <td>{employee.designation ?? "-"}</td>
                      <td>{employee.username ?? "-"}</td>
                      <td>{employee.company_email ?? "-"}</td>
                      <td>{employee.status}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="button-secondary button-inline"
                            type="button"
                            onClick={() => dispatch({ type: "START_EDIT", employee })}
                          >
                            Edit
                          </button>
                          <button
                            className="button-danger button-inline"
                            type="button"
                            onClick={() => void onDelete(employee)}
                            disabled={deletingEmployeeId === employee.id}
                          >
                            {deletingEmployeeId === employee.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
