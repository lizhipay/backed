/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';

type Severity = 'success' | 'error' | 'info' | 'warning';
interface ToastMessage {
  id: number;
  message: string;
  severity: Severity;
}

interface ToastContextValue {
  notify: (message: string, severity?: Severity) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

/** App-wide snackbar provider. Use the useToast hook to fire notifications. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<ToastMessage[]>([]);

  const notify = useCallback((message: string, severity: Severity = 'info') => {
    setQueue((q) => [...q, { id: nextId++, message, severity }]);
  }, []);

  const handleClose = useCallback((id: number) => {
    setQueue((q) => q.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {queue.map((t) => (
        <Snackbar
          key={t.id}
          open
          autoHideDuration={4000}
          onClose={() => handleClose(t.id)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            severity={t.severity}
            variant="filled"
            onClose={() => handleClose(t.id)}
            sx={{ width: '100%' }}
          >
            {t.message}
          </Alert>
        </Snackbar>
      ))}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
