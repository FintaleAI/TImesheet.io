"use client";

import { useEffect, useReducer } from "react";
import { useRouter } from "next/navigation";

import { appConfig } from "@/lib/config";
import { apiRequest } from "@/lib/api";
import { clearAccessToken, getAccessToken } from "@/lib/auth";
import { fetchCurrentUser, type CurrentUser } from "@/lib/session";

type Summary = {
  total_entries: number;
  total_hours: number;
  overtime_entries: number;
  overtime_hours: number;
};

type ByEmployee = {
  employee_id: number | null;
  employee_code: string | null;
  employee_name: string | null;
  total_entries: number;
  total_hours: number;
  overtime_entries: number;
  overtime_hours: number;
};

type ByProject = {
  project_id: number;
  project_code: string;
  project_name: string;
  total_entries: number;
  total_hours: number;
  overtime_entries: number;
  overtime_hours: number;
};

type FilterState = {
  date_from: string;
  date_to: string;
};

const initialFilters: FilterState = {
  date_from: "",
  date_to: "",
};

type State = {
  user: CurrentUser | null;
  summary: Summary | null;
  employeeRows: ByEmployee[];
  projectRows: ByProject[];
  filters: FilterState;
  loading: boolean;
  exporting: boolean;
  error: string | null;
};

type Action =
  | { type: "LOAD_START" }
  | {
      type: "LOAD_SUCCESS";
      user: CurrentUser;
      summary: Summary;
      employeeRows: ByEmployee[];
      projectRows: ByProject[];
    }
  | { type: "LOAD_ERROR"; error: string }
  | { type: "ACCESS_DENIED"; user: CurrentUser }
  | { type: "UPDATE_FILTER"; key: keyof FilterState; value: string }
  | { type: "EXPORT_START" }
  | { type: "EXPORT_DONE" }
  | { type: "EXPORT_ERROR"; error: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "LOAD_START":
      return {
        ...state,
        loading: true,
        error: null,
        summary: null,
        employeeRows: [],
        projectRows: [],
      };
    case "LOAD_SUCCESS":
      return {
        ...state,
        loading: false,
        user: action.user,
        summary: action.summary,
        employeeRows: action.employeeRows,
        projectRows: action.projectRows,
      };
    case "LOAD_ERROR":
      return {
        ...state,
        loading: false,
        error: action.error,
        summary: null,
        employeeRows: [],
        projectRows: [],
      };
    case "ACCESS_DENIED":
      return {
        ...state,
        loading: false,
        user: action.user,
        error: "Reports are available only for admin users.",
        summary: null,
        employeeRows: [],
        projectRows: [],
      };
    case "UPDATE_FILTER":
      return { ...state, filters: { ...state.filters, [action.key]: action.value } };
    case "EXPORT_START":
      return { ...state, exporting: true, error: null };
    case "EXPORT_DONE":
      return { ...state, exporting: false };
    case "EXPORT_ERROR":
      return { ...state, exporting: false, error: action.error };
  }
}

const initialState: State = {
  user: null,
  summary: null,
  employeeRows: [],
  projectRows: [],
  filters: initialFilters,
  loading: true,
  exporting: false,
  error: null,
};

function buildQueryString(filters: FilterState) {
  const params = new URLSearchParams();
  if (filters.date_from) params.set("date_from", filters.date_from);
  if (filters.date_to) params.set("date_to", filters.date_to);
  const query = params.toString();
  return query ? `?${query}` : "";
}

function validateFilters(filters: FilterState): string | null {
  if (filters.date_from && filters.date_to && filters.date_from > filters.date_to) {
    return "From date cannot be later than To date.";
  }
  return null;
}

function getExportFilename(filters: FilterState) {
  if (filters.date_from || filters.date_to) {
    return `timesheets_${filters.date_from || "start"}_${filters.date_to || "end"}.xlsx`;
  }
  return "timesheets.xlsx";
}

export function ReportsPanel() {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, initialState);
  const { user, summary, employeeRows, projectRows, filters, loading, exporting, error } = state;

  async function loadReports(activeFilters: FilterState) {
    const validationError = validateFilters(activeFilters);
    if (validationError) {
      dispatch({ type: "LOAD_ERROR", error: validationError });
      return;
    }

    dispatch({ type: "LOAD_START" });
    try {
      const currentUser = await fetchCurrentUser();
      if (currentUser.must_change_password) {
        router.replace("/change-password");
        return;
      }
      if (currentUser.role !== "Admin") {
        dispatch({ type: "ACCESS_DENIED", user: currentUser });
        return;
      }

      const suffix = buildQueryString(activeFilters);

      const [summaryResult, employeesResult, projectsResult] = await Promise.all([
        apiRequest<Summary>(`/reports/timesheets/summary${suffix}`),
        apiRequest<ByEmployee[]>(`/reports/timesheets/by-employee${suffix}`),
        apiRequest<ByProject[]>(`/reports/timesheets/by-project${suffix}`),
      ]);

      dispatch({
        type: "LOAD_SUCCESS",
        user: currentUser,
        summary: summaryResult,
        employeeRows: employeesResult,
        projectRows: projectsResult,
      });
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Unable to load reports";
      dispatch({ type: "LOAD_ERROR", error: message });
      if (message.toLowerCase().includes("credentials")) {
        clearAccessToken();
        router.push("/");
      }
    }
  }

  useEffect(() => {
    void loadReports(filters);
  }, []);

  function updateFilter(key: keyof FilterState, value: string) {
    dispatch({ type: "UPDATE_FILTER", key, value });
  }

  async function onSubmit(event: { preventDefault(): void }) {
    event.preventDefault();
    await loadReports(filters);
  }

  async function onExport() {
    const validationError = validateFilters(filters);
    if (validationError) {
      dispatch({ type: "EXPORT_ERROR", error: validationError });
      return;
    }

    dispatch({ type: "EXPORT_START" });
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error("Missing credentials");
      }

      const response = await fetch(
        `${appConfig.apiBaseUrl}/timesheets/export.xlsx${buildQueryString(filters)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { detail?: string }
          | null;
        throw new Error(payload?.detail ?? "Unable to export report");
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = getExportFilename(filters);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(objectUrl);
      dispatch({ type: "EXPORT_DONE" });
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Unable to export report";
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
            <h1>Admin Reports</h1>
            <p className="muted">
              Review timesheet volume, overtime, and contribution patterns by employee
              and by project.
            </p>
            {user?.must_change_password ? (
              <p className="warning-text">
                Password change is still required for this account.
              </p>
            ) : null}
          </div>
          <button className="button-primary" type="button" onClick={() => router.push("/dashboard")}>
            Back to dashboard
          </button>
        </div>

        <form className="report-filters" onSubmit={onSubmit}>
          <div className="input-group">
            <label htmlFor="date_from">From</label>
            <input
              id="date_from"
              type="date"
              value={filters.date_from}
              onChange={(event) => updateFilter("date_from", event.target.value)}
            />
          </div>
          <div className="input-group">
            <label htmlFor="date_to">To</label>
            <input
              id="date_to"
              type="date"
              value={filters.date_to}
              onChange={(event) => updateFilter("date_to", event.target.value)}
            />
          </div>
          <div className="form-actions">
            <button className="button-primary" type="submit" disabled={loading}>
              {loading ? "Refreshing..." : "Apply filters"}
            </button>
            <button
              className="button-secondary"
              type="button"
              onClick={() => void onExport()}
              disabled={loading || exporting}
            >
              {exporting ? "Preparing Excel..." : "Download Excel"}
            </button>
          </div>
        </form>

        {error ? <p className="error-text">{error}</p> : null}

        {summary ? (
          <div className="metric-row report-metrics">
            <div className="metric">
              <strong>{summary.total_entries}</strong>
              <span>Total entries</span>
            </div>
            <div className="metric">
              <strong>{summary.total_hours.toFixed(2)}</strong>
              <span>Total hours</span>
            </div>
            <div className="metric">
              <strong>{summary.overtime_entries}</strong>
              <span>Overtime entries</span>
            </div>
            <div className="metric">
              <strong>{summary.overtime_hours.toFixed(2)}</strong>
              <span>Overtime hours</span>
            </div>
          </div>
        ) : null}

        <div className="report-grid">
          <div className="employee-table panel">
            <h2>Hours by employee</h2>
            {loading ? <p className="muted">Loading employee summary...</p> : null}
            {!loading && employeeRows.length === 0 ? (
              <p className="muted">No employee report data found for the selected range.</p>
            ) : null}
            {!loading && employeeRows.length > 0 ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Entries</th>
                      <th>Total Hours</th>
                      <th>Overtime Entries</th>
                      <th>Overtime Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeRows.map((row) => (
                      <tr key={row.employee_id ?? `${row.employee_code}-${row.employee_name}`}>
                        <td>
                          {row.employee_code ?? "-"}{" "}
                          {row.employee_name ? `- ${row.employee_name}` : ""}
                        </td>
                        <td>{row.total_entries}</td>
                        <td>{row.total_hours.toFixed(2)}</td>
                        <td>{row.overtime_entries}</td>
                        <td>{row.overtime_hours.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>

          <div className="employee-table panel">
            <h2>Hours by project</h2>
            {loading ? <p className="muted">Loading project summary...</p> : null}
            {!loading && projectRows.length === 0 ? (
              <p className="muted">No project report data found for the selected range.</p>
            ) : null}
            {!loading && projectRows.length > 0 ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Entries</th>
                      <th>Total Hours</th>
                      <th>Overtime Entries</th>
                      <th>Overtime Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectRows.map((row) => (
                      <tr key={row.project_id}>
                        <td>
                          {row.project_code} - {row.project_name}
                        </td>
                        <td>{row.total_entries}</td>
                        <td>{row.total_hours.toFixed(2)}</td>
                        <td>{row.overtime_entries}</td>
                        <td>{row.overtime_hours.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
