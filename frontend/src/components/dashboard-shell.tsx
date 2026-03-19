"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { clearAccessToken } from "@/lib/auth";
import { fetchCurrentUser, type CurrentUser } from "@/lib/session";

type DashboardModule = {
  title: string;
  description: string;
  href: Route;
};

function getModules(role: string | null): DashboardModule[] {
  if (role === "Admin") {
    return [
      {
        title: "Project Master",
        description: "Create and maintain project metadata, billing context, and recurring flags.",
        href: "/projects",
      },
      {
        title: "Employee Master",
        description: "Manage employee profiles and create the first login identity for each employee.",
        href: "/employees",
      },
      {
        title: "Timesheets",
        description: "Review all submitted timesheets and monitor overtime.",
        href: "/timesheets",
      },
      {
        title: "Reports",
        description: "Track totals, overtime, and contribution by employee or project.",
        href: "/reports",
      },
      {
        title: "Change Password",
        description: "Update the admin password and clear the first-login requirement.",
        href: "/change-password",
      },
    ];
  }

  return [
    {
      title: "Timesheets",
      description: "Log project work and review your own submitted timesheets.",
      href: "/timesheets",
    },
    {
      title: "Projects",
      description: "See the projects currently available for timesheet entry.",
      href: "/timesheets",
    },
    {
      title: "Change Password",
      description: "Update your password after the first login.",
      href: "/change-password",
    },
  ];
}

export function DashboardShell() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchCurrentUser()
      .then((payload) => {
        if (mounted) {
          setUser(payload);
        }
      })
      .catch((requestError) => {
        if (mounted) {
          setError(
            requestError instanceof Error ? requestError.message : "Session expired",
          );
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  function logout() {
    clearAccessToken();
    router.push("/");
  }

  if (error) {
    return (
      <main className="shell">
        <section className="panel hero">
          <h1>Session required</h1>
          <p className="muted">{error}</p>
          <button className="button-primary" type="button" onClick={logout}>
            Return to login
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <section className="panel hero">
        <div className="helper">
          <div>
            <h1>Dashboard Shell</h1>
            <p className="muted">
              {user
                ? `Signed in as ${user.employee_name ?? "User"}${user.role ? ` (${user.role})` : ""}.`
                : "Loading your session and role-aware modules..."}
            </p>
            {user?.must_change_password ? (
              <p className="warning-text">
                Password change required before normal use. Open the password screen next.
              </p>
            ) : null}
          </div>
          <button className="button-primary" type="button" onClick={logout}>
            Logout
          </button>
        </div>
        <div className="nav-row">
          {getModules(user?.role ?? null).map((module) => (
            <article key={module.title} className="nav-card">
              <h2>{module.title}</h2>
              <p className="muted">{module.description}</p>
              {module.href ? <Link href={module.href}>Open module</Link> : null}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
