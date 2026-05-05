import { useSessionStore } from './stores/session'
import { LoginScreen } from './shell/LoginScreen'
import { Desktop } from './shell/Desktop'
import { ConfirmDialog } from './ai/ConfirmDialog'

export function App(): JSX.Element {
  const loggedIn = useSessionStore((s) => s.loggedIn)
  return (
    <>
      {loggedIn ? <Desktop /> : <LoginScreen />}
      <ConfirmDialog />
    </>
  )
}
