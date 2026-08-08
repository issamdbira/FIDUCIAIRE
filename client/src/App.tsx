import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import About from "./pages/About";
import PaieCNSS from "./pages/calculateurs/PaieCNSS";
import RetraiteCNSS from "./pages/calculateurs/RetraiteCNSS";
import IRPP from "./pages/calculateurs/IRPP";
import ActualisationSalaire from "./pages/calculateurs/ActualisationSalaire";
import GenerateurFichePaie from "./pages/calculateurs/GenerateurFichePaie";
import DeclarationsCNSS from "./pages/calculateurs/DeclarationsCNSS";
import TesteurTXT from "./pages/calculateurs/TesteurTXT";
import CalculerSalaire from "./pages/calculateurs/CalculerSalaire";
import Admin from "./pages/Admin";
import ReferentielAvantages from "./pages/calculateurs/ReferentielAvantages";
import DeclarationsNeant from "./pages/calculateurs/DeclarationsNeant";

function AppRoutes() {
  const [location] = useLocation();

  const routes = (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/about" component={About} />
      <Route path="/admin" component={Admin} />
      <Route path="/calculateurs/calculer-salaire" component={CalculerSalaire} />
      <Route path="/referentiel-avantages-exclus" component={ReferentielAvantages} />
      <Route path="/calculateurs/paie-cnss" component={PaieCNSS} />
      <Route path="/calculateurs/retraite-cnss" component={RetraiteCNSS} />
      <Route path="/calculateurs/irpp" component={IRPP} />
      <Route path="/calculateurs/actualisation-salaire" component={ActualisationSalaire} />
      <Route path="/calculateurs/declarations-cnss" component={DeclarationsCNSS} />
      <Route path="/calculateurs/testeur-txt-cnss" component={TesteurTXT} />
      <Route path="/calculateurs/declarations-neant" component={DeclarationsNeant} />
      <Route path="/fiche-de-paie" component={GenerateurFichePaie} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );

  if (location === "/") {
    return routes;
  }

  return <Layout>{routes}</Layout>;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster />
          <AppRoutes />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
