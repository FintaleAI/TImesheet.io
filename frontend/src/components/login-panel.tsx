"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiRequest } from "@/lib/api";
import { setAccessToken } from "@/lib/auth";

type LoginResponse = {
  access_token: string;
  must_change_password: boolean;
  role: string | null;
  user_id: number;
};

export function LoginPanel() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: { preventDefault(): void }) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await apiRequest<LoginResponse>("/auth/login", {
        method: "POST",
        body: {
          identifier,
          password,
        },
        token: null,
      });
      setAccessToken(result.access_token);
      router.push(result.must_change_password ? "/change-password" : "/dashboard");
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to log in",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel login-card">
      <h2>Sign in</h2>
      <p className="muted">
        Enter your username or company email to access the platform.
        Passwords are managed by your administrator.
      </p>
      <form className="login-form" onSubmit={onSubmit}>
        <div className="input-group">
          <label htmlFor="identifier">Username or company email</label>
          <input
            id="identifier"
            placeholder="For now: enter username"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
          />
        </div>
        <div className="input-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        {error ? <p className="error-text">{error}</p> : null}
        <button className="button-primary" type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Login"}
        </button>
      </form>
      <div className="helper">
        <span>Contact your administrator if you need access.</span>
        <Link href="/dashboard">Go to dashboard</Link>
      </div>
    </div>
  );
}
