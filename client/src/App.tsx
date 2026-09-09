import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import GuidesIndex from "./pages/guides/GuidesIndex";
import GuideCalculerSalaire from "./pages/guides/GuideCalculerSalaire";
import GuideIRPP from "./pages/guides/GuideIRPP";
import GuideFichierTXT from "./pages/guides/GuideFichierTXT";
import GuideCotisationsCNSS from "./pages/guides/GuideCotisationsCNSS";
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
import ConventionsList from "./pages/conventions/ConventionsList";
import ConventionDetail from "./pages/conventions/ConventionDetail";
import FichePaieConvention from "./pages/conventions/FichePaieConvention";
import AdminConventions from "./pages/conventions/AdminConventions";

function AppRoutes() {
  const routes = (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route path="/guides" component={GuidesIndex} />
      <Route path="/guides/calculer-salaire-brut-net-tunisie" component={GuideCalculerSalaire} />
      <Route path="/guides/comprendre-calculer-irpp-tunisie" component={GuideIRPP} />
      <Route path="/guides/controle-fichier-declaration-cnss-txt" component={GuideFichierTXT} />
      <Route path="/guides/cotisations-cnss-taux-salariaux-patronaux" component={GuideCotisationsCNSS} />
      <Route path="/admin" component={Admin} />
      <Route path="/calculateurs/calculer-salaire" component={CalculerSalaire} />
      <Route path="/referentiel-avantages-exclus" component={ReferentielAvantages} />
      <Route path="/formulaires-cnss" component={FormulairesCNSS} />
      <Route path="/calculateurs/retraite-cnss" component={RetraiteCNSS} />
      <Route path="/calculateurs/irpp" component={IRPP} />
      <Route path="/calculateurs/actualisation-salaire" component={ActualisationSalaire} />
      <Route path="/calculateurs/declarations-cnss" component={DeclarationsCNSS} />
      <Route path="/calculateurs/testeur-txt-cnss" component={TesteurTXT} />
      <Route path="/calculateurs/declarations-neant" component={DeclarationsNeant} />
      <Route path="/fiche-de-paie" component={GenerateurFichePaie} />
      <Route path="/admin/conventions" component={AdminConventions} />
      <Route path="/conventions/:slug/fiche-paie" component={FichePaieConvention} />
      <Route path="/conventions/:slug" component={ConventionDetail} />
      <Route path="/conventions" component={ConventionsList} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );

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
