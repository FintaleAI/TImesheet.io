"use client";

import { useEffect, useReducer } from "react";
import { useRouter } from "next/navigation";

import { appConfig } from "@/lib/config";
import { apiRequest } from "@/lib/api";
import { clearAccessToken, getAccessToken } from "@/lib/auth";
import { fetchCurrentUser, type CurrentUser } from "@/lib/session";

type Project = {
  id: number;
  project_code: string;
  project_name: string;
};

type MyTimesheet = {
  id: number;
  work_date: string;
  project_id: number;
  project_code: string;
  project_name: string;
  hours: number;
  overtime: boolean;
  remarks: string | null;
};

type AdminTimesheet = {
  id: number;
  work_date: string;
  employee_code: string | null;
  employee_name: string | null;
  project_id: number;
  project_code: string;
  project_name: string;
  hours: number;
  overtime: boolean;
  remarks: string | null;
};

type TimesheetForm = {
  work_date: string;
  project_id: string;
  hours: string;
  remarks: string;
};

const initialForm: TimesheetForm = {
  work_date: "",
  project_id: "",
  hours: "",
  remarks: "",
};

type State = {
  user: CurrentUser | null;
  projects: Project[];
  myEntries: MyTimesheet[];
  adminEntries: AdminTimesheet[];
  form: TimesheetForm;
  editingTimesheetId: number | null;
  error: string | null;
  success: string | null;
  loading: boolean;
  submitting: boolean;
  exporting: boolean;
  deletingTimesheetId: number | null;
};

type Action =
  | { type: "LOAD_START" }
  | {
      type: "LOAD_SUCCESS";
      user: CurrentUser;
      projects: Project[];
      myEntries: MyTimesheet[];
      adminEntries: AdminTimesheet[];
    }
  | { type: "LOAD_ERROR"; error: string }
  | { type: "SUBMIT_START" }
  | {
      type: "SUBMIT_SUCCESS";
      message: string;
      myEntries: MyTimesheet[];
      adminEntries: AdminTimesheet[];
    }
  | { type: "SUBMIT_ERROR"; error: string }
  | { type: "UPDATE_FIELD"; key: keyof TimesheetForm; value: string }
  | { type: "START_EDIT"; entry: MyTimesheet | AdminTimesheet }
  | { type: "CANCEL_EDIT" }
  | { type: "EXPORT_START" }
  | { type: "EXPORT_DONE"; message: string }
  | { type: "EXPORT_ERROR"; error: string }
  | { type: "DELETE_START"; timesheetId: number }
  | {
      type: "DELETE_DONE";
      message: string;
      myEntries: MyTimesheet[];
      adminEntries: AdminTimesheet[];
    }
  | { type: "DELETE_ERROR"; error: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "LOAD_START":
      return { ...state, loading: true, error: null };
    case "LOAD_SUCCESS":
      return {
        ...state,
        loading: false,
        user: action.user,
        projects: action.projects,
        myEntries: action.myEntries,
        adminEntries: action.adminEntries,
      };
    case "LOAD_ERROR":
      return { ...state, loading: false, error: action.error };
    case "SUBMIT_START":
      return { ...state, submitting: true, error: null, success: null };
    case "SUBMIT_SUCCESS":
      return {
        ...state,
        submitting: false,
        success: action.message,
        form: initialForm,
        editingTimesheetId: null,
        myEntries: action.myEntries,
        adminEntries: action.adminEntries,
      };
    case "SUBMIT_ERROR":
      return { ...state, submitting: false, error: action.error };
    case "UPDATE_FIELD":
      return { ...state, form: { ...state.form, [action.key]: action.value } };
    case "START_EDIT":
      return {
        ...state,
        editingTimesheetId: action.entry.id,
        error: null,
        success: null,
        form: {
          work_date: action.entry.work_date,
          project_id: String(action.entry.project_id),
          hours: String(action.entry.hours),
          remarks: action.entry.remarks ?? "",
        },
      };
    case "CANCEL_EDIT":
      return {
        ...state,
        editingTimesheetId: null,
        form: initialForm,
        error: null,
        success: null,
      };
    case "EXPORT_START":
      return { ...state, exporting: true, error: null, success: null };
    case "EXPORT_DONE":
      return { ...state, exporting: false, success: action.message };
    case "EXPORT_ERROR":
      return { ...state, exporting: false, error: action.error };
    case "DELETE_START":
      return {
        ...state,
        deletingTimesheetId: action.timesheetId,
        error: null,
        success: null,
      };
    case "DELETE_DONE":
      return {
        ...state,
        deletingTimesheetId: null,
        success: action.message,
        myEntries: action.myEntries,
        adminEntries: action.adminEntries,
        editingTimesheetId:
          action.myEntries.some((entry) => entry.id === state.editingTimesheetId) ||
          action.adminEntries.some((entry) => entry.id === state.editingTimesheetId)
            ? state.editingTimesheetId
            : null,
        form:
          action.myEntries.some((entry) => entry.id === state.editingTimesheetId) ||
          action.adminEntries.some((entry) => entry.id === state.editingTimesheetId)
            ? state.form
            : initialForm,
      };
    case "DELETE_ERROR":
      return { ...state, deletingTimesheetId: null, error: action.error };
  }
}

const initialState: State = {
  user: null,
  projects: [],
  myEntries: [],
  adminEntries: [],
  form: initialForm,
  editingTimesheetId: null,
  error: null,
  success: null,
  loading: true,
  submitting: false,
  exporting: false,
  deletingTimesheetId: null,
};

function isAdmin(user: CurrentUser | null) {
  return user?.role === "Admin";
}

function buildTimesheetPayload(form: TimesheetForm) {
  return {
    work_date: form.work_date,
    project_id: Number(form.project_id),
    hours: Number(form.hours),
    remarks: form.remarks || null,
  };
}

function getTimesheetExportPath(user: CurrentUser | null) {
  return isAdmin(user) ? "/timesheets/export.xlsx" : "/timesheets/me/export.xlsx";
}

function getTimesheetExportFilename(user: CurrentUser | null) {
  return isAdmin(user) ? "timesheets.xlsx" : "my_timesheets.xlsx";
}

export function TimesheetModule() {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, initialState);
  const {
    user,
    projects,
    myEntries,
    adminEntries,
    form,
    editingTimesheetId,
    error,
    success,
    loading,
    submitting,
    exporting,
    deletingTimesheetId,
  } = state;

  async function loadData() {
    dispatch({ type: "LOAD_START" });
    try {
      const currentUser = await fetchCurrentUser();
      if (currentUser.must_change_password) {
        router.replace("/change-password");
        return;
      }
      const projectsResult = await apiRequest<Project[]>("/projects");

      let myResult: MyTimesheet[] = [];
      let adminResult: AdminTimesheet[] = [];
      if (currentUser.role === "Admin") {
        adminResult = await apiRequest<AdminTimesheet[]>("/timesheets");
      } else {
        myResult = await apiRequest<MyTimesheet[]>("/timesheets/me");
      }

      dispatch({
        type: "LOAD_SUCCESS",
        user: currentUser,
        projects: projectsResult,
        myEntries: myResult,
        adminEntries: adminResult,
      });
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Unable to load timesheet data";
      dispatch({ type: "LOAD_ERROR", error: message });
      if (message.toLowerCase().includes("credentials")) {
        clearAccessToken();
        router.push("/");
      }
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function onSubmit(event: { preventDefault(): void }) {
    event.preventDefault();
    dispatch({ type: "SUBMIT_START" });
    try {
      if (editingTimesheetId === null) {
        const created = await apiRequest<{ overtime: boolean }>("/timesheets", {
          method: "POST",
          body: buildTimesheetPayload(form),
        });
        const refreshed = await apiRequest<MyTimesheet[]>("/timesheets/me");
        dispatch({
          type: "SUBMIT_SUCCESS",
          message: created.overtime
            ? "Timesheet entry saved and marked as overtime."
            : "Timesheet entry saved successfully.",
          myEntries: refreshed,
          adminEntries: [],
        });
        return;
      }

      const updated = await apiRequest<{ overtime: boolean }>(`/timesheets/${editingTimesheetId}`, {
        method: "PUT",
        body: buildTimesheetPayload(form),
      });

      if (isAdmin(user)) {
        const refreshedAdmin = await apiRequest<AdminTimesheet[]>("/timesheets");
        dispatch({
          type: "SUBMIT_SUCCESS",
          message: updated.overtime
            ? "Timesheet updated and still flagged as overtime."
            : "Timesheet updated successfully.",
          myEntries: [],
          adminEntries: refreshedAdmin,
        });
      } else {
        const refreshedMine = await apiRequest<MyTimesheet[]>("/timesheets/me");
        dispatch({
          type: "SUBMIT_SUCCESS",
          message: updated.overtime
            ? "Timesheet updated and marked as overtime."
            : "Timesheet updated successfully.",
          myEntries: refreshedMine,
          adminEntries: [],
        });
      }
    } catch (requestError) {
      dispatch({
        type: "SUBMIT_ERROR",
        error:
          requestError instanceof Error ? requestError.message : "Unable to save timesheet entry",
      });
    }
  }

  async function onDelete(entry: MyTimesheet | AdminTimesheet) {
    dispatch({ type: "DELETE_START", timesheetId: entry.id });
    try {
      await apiRequest<void>(`/timesheets/${entry.id}`, { method: "DELETE" });
      if (isAdmin(user)) {
        const refreshedAdmin = await apiRequest<AdminTimesheet[]>("/timesheets");
        dispatch({
          type: "DELETE_DONE",
          message: "Timesheet deleted successfully.",
          myEntries: [],
          adminEntries: refreshedAdmin,
        });
      } else {
        const refreshedMine = await apiRequest<MyTimesheet[]>("/timesheets/me");
        dispatch({
          type: "DELETE_DONE",
          message: "Timesheet deleted successfully.",
          myEntries: refreshedMine,
          adminEntries: [],
        });
      }
    } catch (requestError) {
      dispatch({
        type: "DELETE_ERROR",
        error: requestError instanceof Error ? requestError.message : "Unable to delete timesheet",
      });
    }
  }

  function updateField(key: keyof TimesheetForm, value: string) {
    dispatch({ type: "UPDATE_FIELD", key, value });
  }

  async function onExport() {
    dispatch({ type: "EXPORT_START" });
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error("Missing credentials");
      }

      const response = await fetch(`${appConfig.apiBaseUrl}${getTimesheetExportPath(user)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { detail?: string }
          | null;
        throw new Error(payload?.detail ?? "Unable to export timesheets");
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = getTimesheetExportFilename(user);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(objectUrl);

      dispatch({
        type: "EXPORT_DONE",
        message: isAdmin(user)
          ? "All timesheets exported successfully."
          : "Your timesheet records exported successfully.",
      });
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Unable to export timesheets";
      dispatch({ type: "EXPORT_ERROR", error: message });
      if (message.toLowerCase().includes("credentials")) {
        clearAccessToken();
        router.push("/");
      }
    }
  }

  return (
    <main className="shell">
      <section className="panel hero">
        <div className="helper">
          <div>
            <h1>Timesheets</h1>
            <p className="muted">
              {isAdmin(user)
                ? "Admins can review, correct, and remove submitted timesheets."
                : "Employees can log project time, revise mistakes, and keep their own record clean."}
            </p>
          </div>
          <button className="button-primary" type="button" onClick={() => router.push("/dashboard")}>
            Back to dashboard
          </button>
        </div>

        <div className="form-actions">
          <button
            className="button-secondary"
            type="button"
            onClick={() => void onExport()}
            disabled={loading || exporting}
          >
            {exporting
              ? "Preparing Excel..."
              : isAdmin(user)
                ? "Download All Timesheets"
                : "Download My Timesheets"}
          </button>
        </div>

        {!isAdmin(user) || editingTimesheetId !== null ? (
          <form className="employee-form" onSubmit={onSubmit}>
            <div className="input-group">
              <label htmlFor="work_date">Work date</label>
              <input
                id="work_date"
                type="date"
                value={form.work_date}
                onChange={(event) => updateField("work_date", event.target.value)}
              />
            </div>
            <div className="input-group">
              <label htmlFor="project_id">Project</label>
              <select
                id="project_id"
                value={form.project_id}
                onChange={(event) => updateField("project_id", event.target.value)}
              >
                <option value="">Select project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.project_code} - {project.project_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label htmlFor="hours">Hours spent</label>
              <input
                id="hours"
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                value={form.hours}
                onChange={(event) => updateField("hours", event.target.value)}
              />
            </div>
            <div className="input-group input-span-2">
              <label htmlFor="remarks">Remarks</label>
              <input
                id="remarks"
                value={form.remarks}
                onChange={(event) => updateField("remarks", event.target.value)}
              />
            </div>
            {error ? <p className="error-text input-span-2">{error}</p> : null}
            {success ? <p className="success-text input-span-2">{success}</p> : null}
            <div className="form-actions input-span-2">
              <button className="button-primary" type="submit" disabled={submitting}>
                {submitting
                  ? editingTimesheetId === null
                    ? "Saving..."
                    : "Updating..."
                  : editingTimesheetId === null
                    ? "Save timesheet"
                    : "Update timesheet"}
              </button>
              {editingTimesheetId !== null ? (
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
        ) : null}

        <div className="employee-table panel">
          <h2>{isAdmin(user) ? "All entries" : "My entries"}</h2>
          {loading ? <p className="muted">Loading timesheets...</p> : null}
          {!loading && !isAdmin(user) && myEntries.length === 0 ? (
            <p className="muted">No timesheet entries found yet.</p>
          ) : null}
          {!loading && isAdmin(user) && adminEntries.length === 0 ? (
            <p className="muted">No timesheet entries found yet.</p>
          ) : null}
          {!loading && !isAdmin(user) && myEntries.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Project</th>
                    <th>Hours</th>
                    <th>Overtime</th>
                    <th>Remarks</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.work_date}</td>
                      <td>
                        {entry.project_code} - {entry.project_name}
                      </td>
                      <td>{entry.hours}</td>
                      <td>{entry.overtime ? "Yes" : "No"}</td>
                      <td>{entry.remarks ?? "-"}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="button-secondary button-inline"
                            type="button"
                            onClick={() => dispatch({ type: "START_EDIT", entry })}
                          >
                            Edit
                          </button>
                          <button
                            className="button-danger button-inline"
                            type="button"
                            onClick={() => void onDelete(entry)}
                            disabled={deletingTimesheetId === entry.id}
                          >
                            {deletingTimesheetId === entry.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {!loading && isAdmin(user) && adminEntries.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Employee</th>
                    <th>Project</th>
                    <th>Hours</th>
                    <th>Overtime</th>
                    <th>Remarks</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.work_date}</td>
                      <td>
                        {entry.employee_code ?? "-"}
                        {entry.employee_name ? ` - ${entry.employee_name}` : ""}
                      </td>
                      <td>
                        {entry.project_code} - {entry.project_name}
                      </td>
                      <td>{entry.hours}</td>
                      <td>{entry.overtime ? "Yes" : "No"}</td>
                      <td>{entry.remarks ?? "-"}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="button-secondary button-inline"
                            type="button"
                            onClick={() => dispatch({ type: "START_EDIT", entry })}
                          >
                            Edit
                          </button>
                          <button
                            className="button-danger button-inline"
                            type="button"
                            onClick={() => void onDelete(entry)}
                            disabled={deletingTimesheetId === entry.id}
                          >
                            {deletingTimesheetId === entry.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {isAdmin(user) ? (
            <p className="warning-text">
              Admin edits use the same backend validation rules as employee self-edits.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
