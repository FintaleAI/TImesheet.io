import streamlit as st
import sqlite3
from datetime import date, datetime
import hashlib
from typing import Optional, Tuple

DB_PATH = "fintale_timesheet.db"

# ------------------------------
# Utilities: DB & Security
# ------------------------------

def get_conn():
    return sqlite3.connect(DB_PATH, check_same_thread=False)


def sha256_hex(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def make_password_hash(password: str, salt: Optional[str] = None) -> Tuple[str, str]:
    """Return (salt, hash). If salt is None, generate one from time+random."""
    if salt is None:
        salt = hashlib.sha256(str(datetime.utcnow().timestamp()).encode()).hexdigest()[:16]
    pw_hash = sha256_hex((salt + password).encode())
    return salt, pw_hash


def verify_password(password: str, salt: str, pw_hash: str) -> bool:
    return sha256_hex((salt + password).encode()) == pw_hash


def init_db():
    con = get_conn()
    cur = con.cursor()

    # Users (login accounts)
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            password_salt TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role in ('Admin','Employee')),
            employee_id INTEGER,
            FOREIGN KEY(employee_id) REFERENCES employees(employee_id)
        )
        """
    )

    # Employees (HR master)
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS employees (
            employee_id INTEGER PRIMARY KEY AUTOINCREMENT,
            emp_code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            qualification TEXT,
            doj TEXT,
            designation TEXT,
            dot TEXT,
            ctc REAL,
            appraisal_date TEXT,
            address TEXT,
            contact TEXT,
            username TEXT UNIQUE
        )
        """
    )

    # Projects (Project master)
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS projects (
            project_id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_code TEXT UNIQUE NOT NULL,
            project_name TEXT NOT NULL,
            start_date TEXT,
            is_recurring INTEGER NOT NULL DEFAULT 0,
            client_name TEXT,
            client_gst TEXT,
            address TEXT,
            contact TEXT,
            timeline TEXT,
            fee_details TEXT
        )
        """
    )

    # Timesheets
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS timesheets (
            ts_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            employee_id INTEGER,
            work_date TEXT NOT NULL,
            project_code TEXT NOT NULL,
            hours REAL NOT NULL,
            remarks TEXT,
            overtime INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY(user_id) REFERENCES users(user_id),
            FOREIGN KEY(employee_id) REFERENCES employees(employee_id),
            FOREIGN KEY(project_code) REFERENCES projects(project_code)
        )
        """
    )

    # Seed a default admin if none exists
    cur.execute("SELECT COUNT(*) FROM users WHERE role='Admin'")
    if cur.fetchone()[0] == 0:
        salt, pw = make_password_hash("admin123")
        cur.execute(
            "INSERT INTO users(username, password_hash, password_salt, role) VALUES (?,?,?,?)",
            ("admin", pw, salt, "Admin"),
        )
        st.toast("Default admin created (username: admin / password: admin123)", icon="✅")

    con.commit()
    con.close()


# ------------------------------
# Helpers for Masters
# ------------------------------

def next_code(prefix: str, table: str, code_field: str) -> str:
    con = get_conn()
    cur = con.cursor()
    cur.execute(f"SELECT {code_field} FROM {table} ORDER BY {code_field} DESC LIMIT 1")
    row = cur.fetchone()
    con.close()
    if not row or not row[0]:
        return f"{prefix}001"
    try:
        n = int(row[0].replace(prefix, "")) + 1
    except Exception:
        # Fallback by counting
        con = get_conn(); cur = con.cursor()
        cur.execute(f"SELECT COUNT(*) FROM {table}")
        n = cur.fetchone()[0] + 1
        con.close()
    return f"{prefix}{n:03d}"


# ------------------------------
# Auth & Session
# ------------------------------

def login(username: str, password: str) -> Optional[dict]:
    con = get_conn(); cur = con.cursor()
    cur.execute("SELECT user_id, username, password_hash, password_salt, role, employee_id FROM users WHERE username=?", (username,))
    row = cur.fetchone()
    con.close()
    if not row:
        return None
    user_id, uname, pw_hash, salt, role, employee_id = row
    if verify_password(password, salt, pw_hash):
        return {"user_id": user_id, "username": uname, "role": role, "employee_id": employee_id}
    return None


def change_password(user_id: int, old_pw: str, new_pw: str) -> bool:
    con = get_conn(); cur = con.cursor()
    cur.execute("SELECT password_hash, password_salt FROM users WHERE user_id=?", (user_id,))
    row = cur.fetchone()
    if not row:
        con.close(); return False
    current_hash, salt = row
    if not verify_password(old_pw, salt, current_hash):
        con.close(); return False
    new_salt, new_hash = make_password_hash(new_pw)
    cur.execute("UPDATE users SET password_hash=?, password_salt=? WHERE user_id=?", (new_hash, new_salt, user_id))
    con.commit(); con.close(); return True


# ------------------------------
# UI Components
# ------------------------------

def ui_login():
    st.header("Fintale Timesheet – Login")
    with st.form("login_form", clear_on_submit=False):
        col1, col2 = st.columns(2)
        with col1:
            username = st.text_input("Username", placeholder="Enter username")
        with col2:
            password = st.text_input("Password", type="password")
        submitted = st.form_submit_button("Login")
    if submitted:
        user = login(username.strip(), password)
        if user:
            st.session_state["auth"] = user
            st.success(f"Welcome, {user['username']} ({user['role']})")
            st.rerun()
        else:
            st.error("Invalid username or password.")


def sidebar_nav(role: str) -> str:
    st.sidebar.image("https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/streamlit.svg", width=36)
    st.sidebar.title("Fintale Timesheet")
    st.sidebar.caption("Single-page · Role-based access")

    if role == "Admin":
        return st.sidebar.radio(
            "Navigate",
            ("Project Master", "Employee Master", "Timesheet (view)", "Change Password", "Logout"),
            index=0,
        )
    else:
        return st.sidebar.radio(
            "Navigate",
            ("Timesheet", "Change Password", "Logout"),
            index=0,
        )


# ------------------------------
# Project Master (Admin)
# ------------------------------

def view_projects():
    con = get_conn(); cur = con.cursor()
    cur.execute("SELECT project_code, project_name, start_date, is_recurring, client_name, client_gst, address, contact, timeline, fee_details FROM projects ORDER BY project_code")
    rows = cur.fetchall(); con.close()
    return rows


def ui_project_master():
    st.header("Project Master")
    with st.form("add_project", clear_on_submit=True):
        project_code = next_code("PRJ", "projects", "project_code")
        st.text_input("Project Code (auto)", value=project_code, disabled=True)
        project_name = st.text_input("Project Name *")
        c1, c2, c3 = st.columns([1,1,1])
        with c1:
            start_date = st.date_input("Start Date", value=date.today())
        with c2:
            is_recurring = st.selectbox("Type", ["One-time", "Recurring"], index=0)
        with c3:
            client_name = st.text_input("Client Name")
        c4, c5 = st.columns(2)
        with c4:
            client_gst = st.text_input("Client GST")
            address = st.text_area("Address", height=80)
        with c5:
            contact = st.text_input("Contact Details")
            timeline = st.text_input("Project timeline (if one-time)")
        fee_details = st.text_area("Fee Details", height=80)
        submitted = st.form_submit_button("Add Project")

    if submitted:
        if not project_name:
            st.error("Project Name is required.")
        else:
            con = get_conn(); cur = con.cursor()
            try:
                cur.execute(
                    """
                    INSERT INTO projects(project_code, project_name, start_date, is_recurring, client_name, client_gst, address, contact, timeline, fee_details)
                    VALUES (?,?,?,?,?,?,?,?,?,?)
                    """,
                    (
                        project_code,
                        project_name.strip(),
                        start_date.isoformat() if isinstance(start_date, date) else str(start_date),
                        1 if is_recurring == "Recurring" else 0,
                        client_name.strip() if client_name else None,
                        client_gst.strip() if client_gst else None,
                        address.strip() if address else None,
                        contact.strip() if contact else None,
                        timeline.strip() if timeline else None,
                        fee_details.strip() if fee_details else None,
                    ),
                )
                con.commit(); st.success(f"Project {project_code} added.")
            except sqlite3.IntegrityError as e:
                st.error(f"Failed to add project: {e}")
            finally:
                con.close()

    st.subheader("Existing Projects")
    rows = view_projects()
    if rows:
        st.dataframe(
            [{
                "Project Code": r[0],
                "Project Name": r[1],
                "Start Date": r[2],
                "Type": "Recurring" if r[3] else "One-time",
                "Client": r[4],
                "GST": r[5],
                "Address": r[6],
                "Contact": r[7],
                "Timeline": r[8],
                "Fee": r[9],
            } for r in rows],
            use_container_width=True,
            hide_index=True,
        )
    else:
        st.info("No projects yet.")


# ------------------------------
# Employee Master (Admin)
# ------------------------------

def ui_employee_master():
    st.header("Employee Master")
    with st.form("add_employee", clear_on_submit=True):
        emp_code = next_code("EMP", "employees", "emp_code")
        st.text_input("Employee Code (auto)", value=emp_code, disabled=True)
        name = st.text_input("Name *")
        c1,c2,c3 = st.columns(3)
        with c1:
            qualification = st.text_input("Qualification")
            doj = st.date_input("Date of Joining", value=date.today())
        with c2:
            designation = st.text_input("Designation")
            dot = st.date_input("Date of Termination", value=None, format="YYYY-MM-DD")
        with c3:
            ctc = st.number_input("CTC (₹)", min_value=0.0, step=1000.0)
            appraisal_date = st.date_input("Date of Appraisal", value=None, format="YYYY-MM-DD")
        c4, c5 = st.columns(2)
        with c4:
            address = st.text_area("Address", height=80)
        with c5:
            contact = st.text_input("Contact Number")

        st.markdown("**Create Login for this Employee**")
        username = st.text_input("Username (unique)")
        password = st.text_input("Temporary Password", type="password")

        submitted = st.form_submit_button("Add Employee")

    if submitted:
        if not name:
            st.error("Name is required.")
        elif not username or not password:
            st.error("Username and Temporary Password are required to create login.")
        else:
            con = get_conn(); cur = con.cursor()
            try:
                cur.execute(
                    """
                    INSERT INTO employees(emp_code, name, qualification, doj, designation, dot, ctc, appraisal_date, address, contact, username)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?)
                    """,
                    (
                        emp_code,
                        name.strip(),
                        qualification.strip() if qualification else None,
                        doj.isoformat() if isinstance(doj, date) else str(doj),
                        designation.strip() if designation else None,
                        dot.isoformat() if isinstance(dot, date) else None,
                        float(ctc) if ctc is not None else None,
                        appraisal_date.isoformat() if isinstance(appraisal_date, date) else None,
                        address.strip() if address else None,
                        contact.strip() if contact else None,
                        username.strip(),
                    ),
                )
                # Create linked user
                cur.execute("SELECT employee_id FROM employees WHERE emp_code=?", (emp_code,))
                employee_id = cur.fetchone()[0]
                salt, pw_hash = make_password_hash(password)
                cur.execute(
                    "INSERT INTO users(username, password_hash, password_salt, role, employee_id) VALUES (?,?,?,?,?)",
                    (username.strip(), pw_hash, salt, "Employee", employee_id),
                )
                con.commit(); st.success(f"Employee {emp_code} added and login created.")
            except sqlite3.IntegrityError as e:
                st.error(f"Failed to add employee or create user: {e}")
            finally:
                con.close()

    # List employees
    con = get_conn(); cur = con.cursor()
    cur.execute(
        "SELECT emp_code, name, designation, doj, dot, ctc, contact, username FROM employees ORDER BY emp_code"
    )
    rows = cur.fetchall(); con.close()
    st.subheader("Existing Employees")
    if rows:
        st.dataframe(
            [{
                "Code": r[0],
                "Name": r[1],
                "Designation": r[2],
                "DOJ": r[3],
                "DOT": r[4],
                "CTC": r[5],
                "Contact": r[6],
                "Username": r[7],
            } for r in rows],
            use_container_width=True,
            hide_index=True,
        )
    else:
        st.info("No employees yet.")


# ------------------------------
# Timesheet (Employees)
# ------------------------------

def load_project_options():
    con = get_conn(); cur = con.cursor()
    cur.execute("SELECT project_code, project_name FROM projects ORDER BY project_code")
    opts = [(row[0], row[1]) for row in cur.fetchall()]
    con.close()
    # Format: "PRJ001 - Project Name"
    return [f"{c} - {n}" for c, n in opts]


def parse_project_code(display_value: str) -> Optional[str]:
    if not display_value:
        return None
    return display_value.split(" - ")[0].strip()


def ui_timesheet(user: dict):
    st.header("Timesheet")
    # Fetch linked employee id if any
    employee_id = user.get("employee_id")

    with st.form("ts_form", clear_on_submit=True):
        work_date = st.date_input("Date", value=date.today())
        project_display = st.selectbox("Project", options=load_project_options(), index=None, placeholder="Select project (code - name)")
        hours = st.number_input("Hours Spent", min_value=0.0, step=0.5, format="%.2f")
        remarks = st.text_area("Remarks (optional)", height=80)
        submitted = st.form_submit_button("Log Time")

    if submitted:
        if not project_display:
            st.error("Please select a project.")
        elif hours <= 0:
            st.error("Hours must be greater than 0.")
        else:
            pcode = parse_project_code(project_display)
            overtime = 1 if hours > 8 else 0
            con = get_conn(); cur = con.cursor()
            cur.execute(
                """
                INSERT INTO timesheets(user_id, employee_id, work_date, project_code, hours, remarks, overtime)
                VALUES (?,?,?,?,?,?,?)
                """,
                (
                    user["user_id"],
                    employee_id,
                    work_date.isoformat() if isinstance(work_date, date) else str(work_date),
                    pcode,
                    float(hours),
                    remarks.strip() if remarks else None,
                    overtime,
                ),
            )
            con.commit(); con.close()
            st.success("Timesheet entry saved." + (" Marked as Overtime." if overtime else ""))

    # Show user's own entries
    st.subheader("My Entries")
    con = get_conn(); cur = con.cursor()
    cur.execute(
        """
        SELECT t.work_date, t.project_code, p.project_name, t.hours, t.overtime, t.remarks
        FROM timesheets t
        LEFT JOIN projects p ON p.project_code = t.project_code
        WHERE t.user_id=?
        ORDER BY t.work_date DESC, t.ts_id DESC
        """,
        (user["user_id"],),
    )
    rows = cur.fetchall(); con.close()

    if rows:
        data = []
        for r in rows:
            d = {
                "Date": r[0],
                "Project": f"{r[1]} - {r[2]}" if r[2] else r[1],
                "Hours": r[3],
                "Overtime": "Yes" if r[4] else "No",
                "Remarks": r[5],
            }
            data.append(d)
        st.dataframe(data, use_container_width=True, hide_index=True)
    else:
        st.info("No entries yet.")


# ------------------------------
# Change Password (All)
# ------------------------------

def ui_change_password(user: dict):
    st.header("Change Password")
    with st.form("cp_form"):
        old = st.text_input("Current Password", type="password")
        new1 = st.text_input("New Password", type="password")
        new2 = st.text_input("Confirm New Password", type="password")
        submitted = st.form_submit_button("Update Password")
    if submitted:
        if not old or not new1 or not new2:
            st.error("All fields are required.")
        elif new1 != new2:
            st.error("New passwords do not match.")
        elif len(new1) < 6:
            st.error("Choose a stronger password (min 6 characters).")
        else:
            ok = change_password(user["user_id"], old, new1)
            if ok:
                st.success("Password updated successfully.")
            else:
                st.error("Current password is incorrect.")


# ------------------------------
# Admin view: Read-only Timesheet (optional)
# ------------------------------

def ui_timesheet_view_admin():
    st.header("Timesheet – Read Only View")
    with st.expander("Filters", expanded=False):
        date_from = st.date_input("From", value=None, format="YYYY-MM-DD")
        date_to = st.date_input("To", value=None, format="YYYY-MM-DD")
    q = """
        SELECT t.work_date, e.emp_code, e.name, t.project_code, p.project_name, t.hours, t.overtime, t.remarks
        FROM timesheets t
        LEFT JOIN employees e ON e.employee_id = t.employee_id
        LEFT JOIN projects p ON p.project_code = t.project_code
    """
    params = []
    where = []
    if date_from:
        where.append("date(t.work_date) >= date(?)")
        params.append(date_from.isoformat())
    if date_to:
        where.append("date(t.work_date) <= date(?)")
        params.append(date_to.isoformat())
    if where:
        q += " WHERE " + " AND ".join(where)
    q += " ORDER BY t.work_date DESC, t.ts_id DESC"

    con = get_conn(); cur = con.cursor(); cur.execute(q, params)
    rows = cur.fetchall(); con.close()

    if rows:
        st.dataframe([
            {
                "Date": r[0],
                "Emp Code": r[1],
                "Employee": r[2],
                "Project": f"{r[3]} - {r[4]}" if r[4] else r[3],
                "Hours": r[5],
                "Overtime": "Yes" if r[6] else "No",
                "Remarks": r[7],
            }
            for r in rows
        ], use_container_width=True, hide_index=True)
    else:
        st.info("No entries for selected range.")


# ------------------------------
# Main App
# ------------------------------

def main():
    st.set_page_config(page_title="Fintale Timesheet", layout="wide")
    init_db()

    auth = st.session_state.get("auth")
    if not auth:
        ui_login()
        return

    choice = sidebar_nav(auth["role"])

    if choice == "Logout":
        st.session_state.pop("auth", None)
        st.success("Logged out.")
        st.rerun()

    if auth["role"] == "Admin":
        if choice == "Project Master":
            ui_project_master()
        elif choice == "Employee Master":
            ui_employee_master()
        elif choice == "Timesheet (view)":
            ui_timesheet_view_admin()
        elif choice == "Change Password":
            ui_change_password(auth)
    else:
        if choice == "Timesheet":
            ui_timesheet(auth)
        elif choice == "Change Password":
            ui_change_password(auth)


if __name__ == "__main__":
    main()
