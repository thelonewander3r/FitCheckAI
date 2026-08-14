import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter, Redirect } from 'wouter';

// Pages
import HomePage from '@/app/page';
import InterviewPage from '@/app/interview/page';
import AnalysisPage from '@/app/interview/[sessionId]/analysis/page';
import TryOnPage from '@/app/interview/[sessionId]/try-on/page';
import PlanPage from '@/app/interview/[sessionId]/plan/page';
import DemoPage from '@/app/demo/page';
import OccasionPage from '@/app/occasion/page';
import OccasionDetailPage from '@/app/occasion/[id]/page';
import WardrobePage from '@/app/wardrobe/page';

const queryClient = new QueryClient();

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/interview" component={InterviewPage} />
        <Route path="/interview/:sessionId/analysis" component={AnalysisPage} />
        <Route path="/interview/:sessionId/try-on" component={TryOnPage} />
        <Route path="/interview/:sessionId/plan" component={PlanPage} />
        {/* Redirect /interview/:sessionId → analysis */}
        <Route path="/interview/:sessionId">
          {(params) => <Redirect to={`/interview/${params.sessionId}/analysis`} />}
        </Route>
        <Route path="/demo" component={DemoPage} />
        <Route path="/occasion" component={OccasionPage} />
        <Route path="/occasion/:id" component={OccasionDetailPage} />
        <Route path="/wardrobe" component={WardrobePage} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
