import { usePrivy } from '@privy-io/react-auth';
import { useAuth } from '../context/AuthContext';

export function PrivySignOutButton() {
  const { logout } = useAuth();
  const { logout: privyLogout } = usePrivy();

  async function handle() {
    try {
      await privyLogout();
    } catch {
      /* ignore */
    }
    await logout();
  }

  return (
    <button
      type="button"
      onClick={() => void handle()}
      className="vtx-btn-ghost ml-2 px-3 py-2 text-sm text-white"
    >
      Sign out
    </button>
  );
}
