import { Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AppShell } from '@/components/layout/AppShell'
import { ErrorBoundary } from '@/components/ui/Loading'
import Home from '@/pages/Home'
import Players from '@/pages/Players'
import PlayerDetail from '@/pages/PlayerDetail'
import Rookies from '@/pages/Rookies'
import Season from '@/pages/Season'
import League from '@/pages/League'
import ComparePlayers from '@/pages/ComparePlayers'
import Teams from '@/pages/Teams'
import TeamDetail from '@/pages/TeamDetail'
import HeadToHead from '@/pages/HeadToHead'
import PredictPlayer from '@/pages/PredictPlayer'
import PredictTeam from '@/pages/PredictTeam'
import Simulate from '@/pages/Simulate'
import Builder from '@/pages/Builder'
import NotFound from '@/pages/NotFound'

export default function App() {
  const location = useLocation()
  return (
    <AppShell>
      {/* Keyed on the path so a crash on one route does not leave the whole app
          stuck in the error state after navigating away. */}
      <ErrorBoundary key={location.pathname}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home />} />
            <Route path="/players" element={<Players />} />
            <Route path="/players/:id" element={<PlayerDetail />} />
            <Route path="/rookies" element={<Rookies />} />
            <Route path="/season" element={<Season />} />
            <Route path="/league" element={<League />} />
            <Route path="/compare" element={<ComparePlayers />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/teams/:abbr" element={<TeamDetail />} />
            <Route path="/head-to-head" element={<HeadToHead />} />
            <Route path="/predict/player" element={<PredictPlayer />} />
            <Route path="/predict/team" element={<PredictTeam />} />
            <Route path="/simulate" element={<Simulate />} />
            <Route path="/builder" element={<Builder />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AnimatePresence>
      </ErrorBoundary>
    </AppShell>
  )
}
