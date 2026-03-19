"use client";

import { useEffect, useReducer } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";
import { clearAccessToken } from "@/lib/auth";

type Project = {
  id: number;
  project_code: string;
  project_name: string;
  start_date: string | null;
  is_recurring: boolean;
  client_name: string | null;
  client_gst: string | null;
  address: string | null;
  contact_details: string | null;
  timeline: string | null;
  fee_details: string | null;
};

type ProjectForm = {
  project_name: string;
  start_date: string;
  is_recurring: boolean;
  client_name: string;
  client_gst: string;
  address: string;
  contact_details: string;
  timeline: string;
  fee_details: string;
};

const initialForm: ProjectForm = {
  project_name: "",
  start_date: "",
  is_recurring: false,
  client_name: "",
  client_gst: "",
  address: "",
  contact_details: "",
  timeline: "",
  fee_details: "",
};

type State = {
  projects: Project[];
  form: ProjectForm;
  editingProjectId: number | null;
  error: string | null;
  success: string | null;
  loading: boolean;
  submitting: boolean;
  deletingProjectId: number | null;
};

type Action =
  | { type: "LOAD_START" }
  | { type: "LOAD_SUCCESS"; projects: Project[] }
  | { type: "LOAD_ERROR"; error: string }
  | { type: "SUBMIT_START" }
  | { type: "SUBMIT_SUCCESS"; message: string; projects: Project[] }
  | { type: "SUBMIT_ERROR"; error: string }
  | { type: "UPDATE_FIELD"; key: keyof ProjectForm; value: string | boolean }
  | { type: "START_EDIT"; project: Project }
  | { type: "CANCEL_EDIT" }
  | { type: "DELETE_START"; projectId: number }
  | { type: "DELETE_DONE"; message: string; projects: Project[] }
  | { type: "DELETE_ERROR"; error: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "LOAD_START":
      return { ...state, loading: true, error: null };
    case "LOAD_SUCCESS":
      return { ...state, loading: false, projects: action.projects };
    case "LOAD_ERROR":
      return { ...state, loading: false, error: action.error };
    case "SUBMIT_START":
      return { ...state, submitting: true, error: null, success: null };
    case "SUBMIT_SUCCESS":
      return {
        ...state,
        submitting: false,
        success: action.message,
        projects: action.projects,
        form: initialForm,
        editingProjectId: null,
      };
    case "SUBMIT_ERROR":
      return { ...state, submitting: false, error: action.error };
    case "UPDATE_FIELD":
      return { ...state, form: { ...state.form, [action.key]: action.value } as ProjectForm };
    case "START_EDIT":
      return {
        ...state,
        editingProjectId: action.project.id,
        error: null,
        success: null,
        form: {
          project_name: action.project.project_name,
          start_date: action.project.start_date ?? "",
          is_recurring: action.project.is_recurring,
          client_name: action.project.client_name ?? "",
          client_gst: action.project.client_gst ?? "",
          address: action.project.address ?? "",
          contact_details: action.project.contact_details ?? "",
          timeline: action.project.timeline ?? "",
          fee_details: action.project.fee_details ?? "",
        },
      };
    case "CANCEL_EDIT":
      return {
        ...state,
        editingProjectId: null,
        form: initialForm,
        error: null,
        success: null,
      };
    case "DELETE_START":
      return {
        ...state,
        deletingProjectId: action.projectId,
        error: null,
        success: null,
      };
    case "DELETE_DONE":
      return {
        ...state,
        deletingProjectId: null,
        success: action.message,
        projects: action.projects,
        editingProjectId: action.projects.some((project) => project.id === state.editingProjectId)
          ? state.editingProjectId
          : null,
        form: action.projects.some((project) => project.id === state.editingProjectId)
          ? state.form
          : initialForm,
      };
    case "DELETE_ERROR":
      return { ...state, deletingProjectId: null, error: action.error };
  }
}

const initialState: State = {
  projects: [],
  form: initialForm,
  editingProjectId: null,
  error: null,
  success: null,
  loading: true,
  submitting: false,
  deletingProjectId: null,
};

function buildProjectPayload(form: ProjectForm) {
  return {
    project_name: form.project_name,
    start_date: form.start_date || null,
    is_recurring: form.is_recurring,
    client_name: form.client_name || null,
    client_gst: form.client_gst || null,
    address: form.address || null,
    contact_details: form.contact_details || null,
    timeline: form.timeline || null,
    fee_details: form.fee_details || null,
  };
}

export function ProjectMaster() {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, initialState);
  const {
    projects,
    form,
    editingProjectId,
    error,
    success,
    loading,
    submitting,
    deletingProjectId,
  } = state;

  async function loadProjects() {
    dispatch({ type: "LOAD_START" });
    try {
      const currentUser = await apiRequest<{ must_change_password: boolean }>("/auth/me");
      if (currentUser.must_change_password) {
        router.replace("/change-password");
        return;
      }
      const result = await apiRequest<Project[]>("/projects");
      dispatch({ type: "LOAD_SUCCESS", projects: result });
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Unable to load projects";
      dispatch({ type: "LOAD_ERROR", error: message });
      if (message.toLowerCase().includes("credentials")) {
        clearAccessToken();
        router.push("/");
      }
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  async function onSubmit(event: { preventDefault(): void }) {
    event.preventDefault();
    dispatch({ type: "SUBMIT_START" });
    try {
      if (editingProjectId === null) {
        const created = await apiRequest<{ project_code: string }>("/projects", {
          method: "POST",
          body: buildProjectPayload(form),
        });
        const refreshed = await apiRequest<Project[]>("/projects");
        dispatch({
          type: "SUBMIT_SUCCESS",
          message: `Project ${created.project_code} created successfully.`,
          projects: refreshed,
        });
        return;
      }

      const updated = await apiRequest<{ project_code: string }>(`/projects/${editingProjectId}`, {
        method: "PUT",
        body: buildProjectPayload(form),
      });
      const refreshed = await apiRequest<Project[]>("/projects");
      dispatch({
        type: "SUBMIT_SUCCESS",
        message: `Project ${updated.project_code} updated successfully.`,
        projects: refreshed,
      });
    } catch (requestError) {
      dispatch({
        type: "SUBMIT_ERROR",
        error:
          requestError instanceof Error
            ? requestError.message
            : editingProjectId === null
              ? "Unable to create project"
              : "Unable to update project",
      });
    }
  }

  async function onDelete(project: Project) {
    dispatch({ type: "DELETE_START", projectId: project.id });
    try {
      await apiRequest<void>(`/projects/${project.id}`, { method: "DELETE" });
      const refreshed = await apiRequest<Project[]>("/projects");
      dispatch({
        type: "DELETE_DONE",
        message: `Project ${project.project_code} deleted successfully.`,
        projects: refreshed,
      });
    } catch (requestError) {
      dispatch({
        type: "DELETE_ERROR",
        error: requestError instanceof Error ? requestError.message : "Unable to delete project",
      });
    }
  }

  function updateField<K extends keyof ProjectForm>(key: K, value: ProjectForm[K]) {
    dispatch({ type: "UPDATE_FIELD", key, value });
  }

  return (
    <main className="shell">
      <section className="panel hero">
        <div className="helper">
          <div>
            <h1>Project Master</h1>
            <p className="muted">
              Admins can create, refine, and retire projects while keeping the catalog
              ready for employee time entry.
            </p>
          </div>
          <button className="button-primary" type="button" onClick={() => router.push("/dashboard")}>
            Back to dashboard
          </button>
        </div>

        <form className="employee-form" onSubmit={onSubmit}>
          <div className="input-group">
            <label htmlFor="project_name">Project name</label>
            <input
              id="project_name"
              value={form.project_name}
              onChange={(event) => updateField("project_name", event.target.value)}
            />
          </div>
          <div className="input-group">
            <label htmlFor="start_date">Start date</label>
            <input
              id="start_date"
              type="date"
              value={form.start_date}
              onChange={(event) => updateField("start_date", event.target.value)}
            />
          </div>
          <div className="input-group checkbox-group">
            <label htmlFor="is_recurring">Recurring project</label>
            <input
              id="is_recurring"
              type="checkbox"
              checked={form.is_recurring}
              onChange={(event) => updateField("is_recurring", event.target.checked)}
            />
          </div>
          <div className="input-group">
            <label htmlFor="client_name">Client name</label>
            <input
              id="client_name"
              value={form.client_name}
              onChange={(event) => updateField("client_name", event.target.value)}
            />
          </div>
          <div className="input-group">
            <label htmlFor="client_gst">Client GST</label>
            <input
              id="client_gst"
              value={form.client_gst}
              onChange={(event) => updateField("client_gst", event.target.value)}
            />
          </div>
          <div className="input-group">
            <label htmlFor="contact_details">Contact details</label>
            <input
              id="contact_details"
              value={form.contact_details}
              onChange={(event) => updateField("contact_details", event.target.value)}
            />
          </div>
          <div className="input-group">
            <label htmlFor="timeline">Timeline</label>
            <input
              id="timeline"
              value={form.timeline}
              onChange={(event) => updateField("timeline", event.target.value)}
            />
          </div>
          <div className="input-group">
            <label htmlFor="address">Address</label>
            <input
              id="address"
              value={form.address}
              onChange={(event) => updateField("address", event.target.value)}
            />
          </div>
          <div className="input-group input-span-2">
            <label htmlFor="fee_details">Fee details</label>
            <input
              id="fee_details"
              value={form.fee_details}
              onChange={(event) => updateField("fee_details", event.target.value)}
            />
          </div>
          {error ? <p className="error-text input-span-2">{error}</p> : null}
          {success ? <p className="success-text input-span-2">{success}</p> : null}
          <div className="form-actions input-span-2">
            <button className="button-primary" type="submit" disabled={submitting}>
              {submitting
                ? editingProjectId === null
                  ? "Creating project..."
                  : "Saving project..."
                : editingProjectId === null
                  ? "Create project"
                  : "Save project"}
            </button>
            {editingProjectId !== null ? (
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
          <h2>Existing projects</h2>
          {loading ? <p className="muted">Loading projects...</p> : null}
          {!loading && projects.length === 0 ? (
            <p className="muted">No projects found yet.</p>
          ) : null}
          {!loading && projects.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Client</th>
                    <th>Start</th>
                    <th>Timeline</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr key={project.id}>
                      <td>{project.project_code}</td>
                      <td>{project.project_name}</td>
                      <td>{project.is_recurring ? "Recurring" : "One-time"}</td>
                      <td>{project.client_name ?? "-"}</td>
                      <td>{project.start_date ?? "-"}</td>
                      <td>{project.timeline ?? "-"}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="button-secondary button-inline"
                            type="button"
                            onClick={() => dispatch({ type: "START_EDIT", project })}
                          >
                            Edit
                          </button>
                          <button
                            className="button-danger button-inline"
                            type="button"
                            onClick={() => void onDelete(project)}
                            disabled={deletingProjectId === project.id}
                          >
                            {deletingProjectId === project.id ? "Deleting..." : "Delete"}
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
