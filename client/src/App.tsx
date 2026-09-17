import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
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
import RegimesSociaux from "./pages/RegimesSociaux";
import DashboardCabinet from "./pages/DashboardCabinet";
import DashboardWorkspace from "./pages/DashboardWorkspace";
import AuditLog from "./pages/AuditLog";
import Login from "./pages/Login";
import CreerEspace from "./pages/CreerEspace";
import Invitation from "./pages/Invitation";
import Reinitialisation from "./pages/Reinitialisation";
import MotDePasseOublie from "./pages/MotDePasseOublie";
import GestionClients from "./pages/gestion/GestionClients";
import GestionContrats from "./pages/gestion/GestionContrats";
import GestionConventions from "./pages/gestion/GestionConventions";
import GestionPaie from "./pages/gestion/GestionPaie";
import GestionPointage from "./pages/gestion/GestionPointage";
import GestionCNSS from "./pages/gestion/GestionCNSS";
import GestionDocuments from "./pages/gestion/GestionDocuments";
import GestionEmployes from "./pages/gestion/GestionEmployes";
import GestionMembres from "./pages/gestion/GestionMembres";

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
      <Route path="/login" component={Login} />
      <Route path="/creer-espace" component={CreerEspace} />
      <Route path="/invitation" component={Invitation} />
      <Route path="/reinitialisation" component={Reinitialisation} />
      <Route path="/mot-de-passe-oublie" component={MotDePasseOublie} />
      <Route path="/calculateurs/calculer-salaire" component={CalculerSalaire} />
      <Route path="/referentiel-avantages-exclus" component={ReferentielAvantages} />
      <Route path="/formulaires-cnss" component={FormulairesCNSS} />
      <Route path="/regimes-sociaux" component={RegimesSociaux} />
      <Route path="/calculateurs/retraite-cnss" component={RetraiteCNSS} />
      <Route path="/calculateurs/irpp" component={IRPP} />
      <Route path="/calculateurs/actualisation-salaire" component={ActualisationSalaire} />
      <Route path="/calculateurs/declarations-cnss" component={DeclarationsCNSS} />
      <Route path="/calculateurs/testeur-txt-cnss" component={TesteurTXT} />
      <Route path="/calculateurs/declarations-neant" component={DeclarationsNeant} />
      <Route path="/fiche-de-paie" component={GenerateurFichePaie} />
      <Route path="/admin">
        <ProtectedRoute>
          <Admin />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/conventions">
        <ProtectedRoute>
          <AdminConventions />
        </ProtectedRoute>
      </Route>
      <Route path="/conventions/:slug/fiche-paie" component={FichePaieConvention} />
      <Route path="/conventions/:slug" component={ConventionDetail} />
      <Route path="/conventions" component={ConventionsList} />
      <Route path="/dashboard/cabinet">
        <ProtectedRoute roles={["PROPRIETAIRE"]}>
          <DashboardCabinet />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/workspace">
        <ProtectedRoute>
          <DashboardWorkspace />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/audit">
        <ProtectedRoute>
          <AuditLog />
        </ProtectedRoute>
      </Route>
      <Route path="/gestion/clients">
        <ProtectedRoute>
          <GestionClients />
        </ProtectedRoute>
      </Route>
      <Route path="/gestion/contrats">
        <ProtectedRoute>
          <GestionContrats />
        </ProtectedRoute>
      </Route>
      <Route path="/gestion/conventions">
        <ProtectedRoute>
          <GestionConventions />
        </ProtectedRoute>
      </Route>
      <Route path="/gestion/paie">
        <ProtectedRoute>
          <GestionPaie />
        </ProtectedRoute>
      </Route>
      <Route path="/gestion/pointage">
        <ProtectedRoute>
          <GestionPointage />
        </ProtectedRoute>
      </Route>
      <Route path="/gestion/cnss">
        <ProtectedRoute>
          <GestionCNSS />
        </ProtectedRoute>
      </Route>
      <Route path="/gestion/documents">
        <ProtectedRoute>
          <GestionDocuments />
        </ProtectedRoute>
      </Route>
      <Route path="/gestion/employes">
        <ProtectedRoute>
          <GestionEmployes />
        </ProtectedRoute>
      </Route>
      <Route path="/gestion/membres">
        <ProtectedRoute roles={["PROPRIETAIRE"]}>
          <GestionMembres />
        </ProtectedRoute>
      </Route>
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
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <AppRoutes />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
