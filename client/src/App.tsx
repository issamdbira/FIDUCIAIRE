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

// Lot 8-5.3 — Route-level lazy loading
// Les pages publiques (About, Contact, Guides, Calculateurs, Conventions) sont
// chargées à la demande. Home reste eager (première page vue, LCP critique).
// Les pages protégées (Dashboard, Gestion, Admin) sont aussi lazy-loaded pour
// éviter de charger toute la logique d'auth dans le bundle initial.
import { lazy, Suspense } from "react";

const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const GuidesIndex = lazy(() => import("./pages/guides/GuidesIndex"));
const GuideCalculerSalaire = lazy(() => import("./pages/guides/GuideCalculerSalaire"));
const GuideIRPP = lazy(() => import("./pages/guides/GuideIRPP"));
const GuideFichierTXT = lazy(() => import("./pages/guides/GuideFichierTXT"));
const GuideCotisationsCNSS = lazy(() => import("./pages/guides/GuideCotisationsCNSS"));
const RetraiteCNSS = lazy(() => import("./pages/calculateurs/RetraiteCNSS"));
const IRPP = lazy(() => import("./pages/calculateurs/IRPP"));
const ActualisationSalaire = lazy(() => import("./pages/calculateurs/ActualisationSalaire"));
const GenerateurFichePaie = lazy(() => import("./pages/calculateurs/GenerateurFichePaie"));
const DeclarationsCNSS = lazy(() => import("./pages/calculateurs/DeclarationsCNSS"));
const TesteurTXT = lazy(() => import("./pages/calculateurs/TesteurTXT"));
const CalculerSalaire = lazy(() => import("./pages/calculateurs/CalculerSalaire"));
const Admin = lazy(() => import("./pages/Admin"));
const ReferentielAvantages = lazy(() => import("./pages/calculateurs/ReferentielAvantages"));
const FormulairesCNSS = lazy(() => import("./pages/FormulairesCNSS"));
const DeclarationsNeant = lazy(() => import("./pages/calculateurs/DeclarationsNeant"));
const ConventionsList = lazy(() => import("./pages/conventions/ConventionsList"));
const ConventionDetail = lazy(() => import("./pages/conventions/ConventionDetail"));
const FichePaieConvention = lazy(() => import("./pages/conventions/FichePaieConvention"));
const AdminConventions = lazy(() => import("./pages/conventions/AdminConventions"));
const RegimesSociaux = lazy(() => import("./pages/RegimesSociaux"));
const DashboardCabinet = lazy(() => import("./pages/DashboardCabinet"));
const DashboardWorkspace = lazy(() => import("./pages/DashboardWorkspace"));
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
import MessagesContact from "./pages/gestion/MessagesContact";

function AppRoutes() {
  // Lot 8-5.3 : Suspense wrapper pour le route-level lazy loading
  const routes = (
    <Suspense fallback={<div className="min-h-[calc(100vh-48px)] flex items-center justify-center"><div className="h-8 w-8 border-4 border-primary border-r-transparent rounded-full animate-spin" /></div>}>
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
      <Route path="/gestion/messages">
        <ProtectedRoute roles={["PROPRIETAIRE"]}>
          <MessagesContact />
        </ProtectedRoute>
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
    </Suspense>
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
