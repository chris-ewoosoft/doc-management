import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DocumentEditor from "@/pages/DocumentEditor";
import Documents from "@/pages/Documents";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";
import Settings from "@/pages/Settings";
import RequireAuth from "@/components/RequireAuth";
import { Redirect, Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function Router() {
  return (
    <Switch>
      <Route path="/">
        <Redirect to="/documents" />
      </Route>
      <Route path="/login" component={Login} />
      <Route path="/documents">
        <RequireAuth>
          <Documents />
        </RequireAuth>
      </Route>
      <Route path="/documents/:id">
        <RequireAuth>
          <DocumentEditor />
        </RequireAuth>
      </Route>
      <Route path="/settings">
        <Settings />
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
