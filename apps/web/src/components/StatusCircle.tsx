import { motion, AnimatePresence } from "framer-motion"
import { Check } from "lucide-react"

interface StatusCircleProps {
  checked: boolean
  onChange: () => void
}

export function StatusCircle({ checked, onChange }: StatusCircleProps) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex items-center justify-center min-w-touch min-h-touch"
      aria-label={checked ? "Marcar como pendente" : "Marcar como concluído"}
    >
      <motion.div
        className="relative w-7 h-7 rounded-status"
        whileTap={{ scale: 0.95 }}
        animate={checked ? { scale: [1, 1.15, 1] } : { scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="absolute inset-0 rounded-status border-2"
          animate={{
            borderColor: checked ? "transparent" : "hsl(var(--border))",
            backgroundColor: checked ? "#FF385C" : "transparent",
          }}
          whileHover={{ borderColor: checked ? "transparent" : "#FF385C" }}
          transition={{ duration: 0.2 }}
        />

        <AnimatePresence>
          {checked && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.15, delay: 0.1 }}
            >
              <Check className="w-4 h-4 text-white" strokeWidth={3} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </button>
  )
}
