import { Route, Switch } from "wouter";
import Chat from "./pages/Chat";
import Dashboard from "./pages/Dashboard";
import Welcome from "./pages/Welcome";

export default function App() {
  return (
    <Switch>
      <Route path="/" component={Welcome} />
      <Route path="/s/:id" component={Chat} />
      <Route path="/s/:id/dashboard" component={Dashboard} />
      <Route>
        <div className="flex h-screen items-center justify-center">
          <p className="text-gray-400">404 — Not found</p>
        </div>
      </Route>
    </Switch>
  );
}
