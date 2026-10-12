import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// ── Mock du router applicatif ──────────────────────────────────────────────
// Remplace le vrai router (qui chargerait toutes les pages + leurs appels API)
// par des routes stub sans aucune dépendance externe.
vi.mock("@/router", async () => {
  const { createMemoryRouter } = await import("react-router");
  return {
    router: createMemoryRouter([
      { path: "/", element: <div>Tableau</div> },
      { path: "/login", element: <div>Page Login</div> },
    ]),
  };
});

// ── Helpers ────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function errorResponse(status: number) {
  return new Response(null, { status });
}

// ── Setup / teardown ──────────────────────────────────────────────────────
// vi.resetModules() donne un module SessionProvider frais à chaque test,
// ce qui force sessionRefresh à recréer son fetch (et à frapper notre spy).
// L'import dynamique de useAuthStore APRÈS l'import de SessionProvider
// garantit qu'on accède à la même instance du store que le composant.

beforeEach(() => {
  vi.resetModules();
  sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("SessionProvider", () => {
  it("affiche un spinner pendant le fetch initial", async () => {
    // Promise qui ne résout jamais → spinner visible indéfiniment
    vi.spyOn(globalThis, "fetch").mockReturnValueOnce(new Promise(() => {}));

    const { SessionProvider } = await import("./SessionProvider");
    render(<SessionProvider />);

    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("cache le spinner une fois la promesse résolue (succès)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse({ accessToken: "token" }),
    );

    const { SessionProvider } = await import("./SessionProvider");
    render(<SessionProvider />);

    await waitFor(() =>
      expect(document.querySelector(".animate-spin")).not.toBeInTheDocument(),
    );
  });

  it("cache le spinner une fois la promesse résolue (échec)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(errorResponse(401));

    const { SessionProvider } = await import("./SessionProvider");
    render(<SessionProvider />);

    await waitFor(() =>
      expect(document.querySelector(".animate-spin")).not.toBeInTheDocument(),
    );
  });

  it("restaure la session quand /auth/refresh retourne 200", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse({ accessToken: "restored-token" }),
    );
    sessionStorage.setItem("username", "admin");

    const { SessionProvider } = await import("./SessionProvider");
    // Import APRÈS SessionProvider → même instance de store
    const { useAuthStore } = await import("@/store/auth.store");

    render(<SessionProvider />);

    await waitFor(() =>
      expect(useAuthStore.getState().accessToken).toBe("restored-token"),
    );
    expect(useAuthStore.getState().username).toBe("admin");
  });

  it("appelle clearAuth quand /auth/refresh retourne 401", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(errorResponse(401));

    const { SessionProvider } = await import("./SessionProvider");
    const { useAuthStore } = await import("@/store/auth.store");

    // Simule une session stale pré-existante
    useAuthStore.setState({
      accessToken: "stale",
      username: "admin",
      role: "ADMIN",
      userId: "x",
    });

    render(<SessionProvider />);

    await waitFor(() => expect(useAuthStore.getState().accessToken).toBeNull());
    expect(useAuthStore.getState().role).toBeNull();
    expect(useAuthStore.getState().username).toBe("");
  });

  it("appelle clearAuth quand le réseau est indisponible", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("fetch failed"));

    const { SessionProvider } = await import("./SessionProvider");
    const { useAuthStore } = await import("@/store/auth.store");

    render(<SessionProvider />);

    await waitFor(() => expect(useAuthStore.getState().accessToken).toBeNull());
  });

  it("affiche le RouterProvider après résolution (contenu app visible)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse({ accessToken: "token" }),
    );

    const { SessionProvider } = await import("./SessionProvider");
    render(<SessionProvider />);

    // Le router stub rend <div>Tableau</div> sur le path "/"
    await waitFor(() =>
      expect(screen.getByText("Tableau")).toBeInTheDocument(),
    );
  });
});
