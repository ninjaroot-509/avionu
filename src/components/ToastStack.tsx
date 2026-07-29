import { AnimatePresence, motion } from "framer-motion";
import { useGameStore } from "@/src/store/gameStore";

export const ToastStack = () => {
  const notifications = useGameStore((state) => state.notifications);
  const dismiss = useGameStore((state) => state.dismissNotification);

  return (
    <div
      className="toast-stack"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        {notifications.map((notification) => (
          <motion.button
            className={`toast toast-${notification.tone}`}
            type="button"
            key={notification.id}
            initial={{ opacity: 0, x: 34, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            onClick={() => dismiss(notification.id)}
          >
            <span className="toast-mark" />
            <span>
              <strong>{notification.title}</strong>
              <small>{notification.message}</small>
            </span>
            <span className="toast-close" aria-hidden="true">
              ×
            </span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
};
