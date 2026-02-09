import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Join from "@/pages/Join";
import Team from "@/pages/Team";
import Departments from "@/pages/Departments";
import DepartmentPortal from "@/pages/DepartmentPortal";
import Admin from "@/pages/Admin";
import Rules from "@/pages/Rules";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/rules" component={Rules} />
      <Route path="/join" component={Join} />
      <Route path="/team" component={Team} />
      <Route path="/departments" component={Departments} />
      <Route path="/departments/:code" component={DepartmentPortal} />
      <Route path="/departments/:code/:tab" component={DepartmentPortal} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin/:tab" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
