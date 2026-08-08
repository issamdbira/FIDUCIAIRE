import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { WorkspaceProvider } from "./contexts/WorkspaceContext";
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
import FormulairesCNSS from "./pages/FormulairesCNSS";
import DeclarationsNeant from "./pages/calculateurs/DeclarationsNeant";
import FiduciaireDashboard from "./pages/FiduciaireDashboard";
import EntrepriseDashboard from "./pages/EntrepriseDashboard";
import Facturation from "./pages/Facturation";
import Employes from "./pages/Employes";
import Tresorerie from "./pages/Tresorerie";
import Parametres from "./pages/Parametres";

function AppRoutes() {
  const [location] = useLocation();

  const routes = (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/about" component={About} />
      <Route path="/admin" component={Admin} />
      <Route path="/calculateurs/calculer-salaire" component={CalculerSalaire} />
      <Route path="/referentiel-avantages-exclus" component={ReferentielAvantages} />
      <Route path="/formulaires-cnss" component={FormulairesCNSS} />
      <Route path="/calculateurs/paie-cnss" component={PaieCNSS} />
      <Route path="/calculateurs/retraite-cnss" component={RetraiteCNSS} />
      <Route path="/calculateurs/irpp" component={IRPP} />
      <Route path="/calculateurs/actualisation-salaire" component={ActualisationSalaire} />
      <Route path="/calculateurs/declarations-cnss" component={DeclarationsCNSS} />
      <Route path="/calculateurs/testeur-txt-cnss" component={TesteurTXT} />
      <Route path="/calculateurs/declarations-neant" component={DeclarationsNeant} />
      <Route path="/fiche-de-paie" component={GenerateurFichePaie} />
      <Route path="/expert" component={FiduciaireDashboard} />
      <Route path="/dashboard" component={EntrepriseDashboard} />
      <Route path="/facturation" component={Facturation} />
      <Route path="/employes" component={Employes} />
      <Route path="/tresorerie" component={Tresorerie} />
      <Route path="/parametres" component={Parametres} />
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
        <WorkspaceProvider>
          <TooltipProvider>
            <Toaster />
            <AppRoutes />
          </TooltipProvider>
        </WorkspaceProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
