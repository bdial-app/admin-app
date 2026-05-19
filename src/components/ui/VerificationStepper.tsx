import { FileText, Search, ShieldCheck, CheckCircle2, XCircle, Clock } from 'lucide-react';
import type { Verification } from '../../types';

interface Step {
  id: number;
  label: string;
  description: string;
  icon: typeof FileText;
}

const STEPS: Step[] = [
  { id: 1, label: 'Document Submitted', description: 'Identity document uploaded', icon: FileText },
  { id: 2, label: 'Under Review', description: 'Admin reviewing documents', icon: Search },
  { id: 3, label: 'Identity Verified', description: 'Aadhaar card verification', icon: ShieldCheck },
  { id: 4, label: 'Decision', description: 'Final verification outcome', icon: CheckCircle2 },
];

function resolveCurrentStep(v: Verification): number {
  // Step 4: Decision made (approved or rejected with review)
  if (v.aadhaarStatus === 'approved') return 4;
  if (v.aadhaarStatus === 'rejected' && v.reviewedAt) return 4;
  // Step 3: Reviewed but partial
  if (v.reviewedAt) return 3;
  // Step 2: Pending review (documents exist)
  if (v.aadhaarDocUrl) return 2;
  // Step 1: Just submitted
  return 1;
}

function resolveStepStatus(
  stepId: number,
  currentStep: number,
  verification: Verification,
): 'completed' | 'active' | 'rejected' | 'upcoming' {
  if (stepId < currentStep) return 'completed';
  if (stepId === currentStep) {
    if (stepId === 4 && verification.aadhaarStatus === 'rejected') return 'rejected';
    if (stepId === 4 && verification.aadhaarStatus === 'approved') return 'completed';
    return 'active';
  }
  return 'upcoming';
}

const STATUS_STYLES = {
  completed: {
    ring: 'var(--color-success)',
    bg: 'var(--color-success)',
    text: 'white',
    line: 'var(--color-success)',
    label: 'var(--color-success)',
  },
  active: {
    ring: 'var(--color-primary)',
    bg: 'var(--color-primary)',
    text: 'white',
    line: 'var(--border-default)',
    label: 'var(--color-primary)',
  },
  rejected: {
    ring: 'var(--color-danger)',
    bg: 'var(--color-danger)',
    text: 'white',
    line: 'var(--border-default)',
    label: 'var(--color-danger)',
  },
  upcoming: {
    ring: 'var(--border-default)',
    bg: 'var(--surface-1)',
    text: 'var(--text-muted)',
    line: 'var(--border-default)',
    label: 'var(--text-muted)',
  },
};

interface VerificationStepperProps {
  verification: Verification;
}

export function VerificationStepper({ verification }: VerificationStepperProps) {
  const currentStep = resolveCurrentStep(verification);

  return (
    <div className="py-2">
      <div className="flex items-start">
        {STEPS.map((step, idx) => {
          const status = resolveStepStatus(step.id, currentStep, verification);
          const styles = STATUS_STYLES[status];
          const Icon = status === 'completed'
            ? CheckCircle2
            : status === 'rejected'
              ? XCircle
              : status === 'active'
                ? Clock
                : step.icon;

          return (
            <div key={step.id} className="flex items-start flex-1">
              {/* Step node */}
              <div className="flex flex-col items-center flex-shrink-0" style={{ width: 64 }}>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all"
                  style={{
                    borderColor: styles.ring,
                    background: status === 'upcoming' ? styles.bg : styles.bg,
                  }}
                >
                  <Icon
                    className="w-4 h-4"
                    style={{ color: status === 'upcoming' ? styles.text : 'white' }}
                  />
                </div>
                <p
                  className="text-[10px] font-semibold mt-1.5 text-center leading-tight"
                  style={{ color: styles.label }}
                >
                  {step.label}
                </p>
                <p
                  className="text-[9px] mt-0.5 text-center leading-tight"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {step.description}
                </p>
              </div>

              {/* Connector line */}
              {idx < STEPS.length - 1 && (
                <div
                  className="flex-1 mt-[18px] mx-1"
                  style={{
                    height: 2,
                    background: step.id < currentStep ? 'var(--color-success)' : 'var(--border-default)',
                    borderRadius: 1,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Status summary below stepper */}
      <div
        className="mt-4 p-3 rounded-lg flex items-center gap-3"
        style={{
          background: verification.aadhaarStatus === 'approved'
            ? 'color-mix(in srgb, var(--color-success) 10%, transparent)'
            : verification.aadhaarStatus === 'rejected'
              ? 'color-mix(in srgb, var(--color-danger) 10%, transparent)'
              : 'color-mix(in srgb, var(--color-warning) 10%, transparent)',
          border: `1px solid ${
            verification.aadhaarStatus === 'approved'
              ? 'color-mix(in srgb, var(--color-success) 25%, transparent)'
              : verification.aadhaarStatus === 'rejected'
                ? 'color-mix(in srgb, var(--color-danger) 25%, transparent)'
                : 'color-mix(in srgb, var(--color-warning) 25%, transparent)'
          }`,
        }}
      >
        {verification.aadhaarStatus === 'approved' ? (
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-success)' }} />
        ) : verification.aadhaarStatus === 'rejected' ? (
          <XCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-danger)' }} />
        ) : (
          <Clock className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-warning)' }} />
        )}
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {verification.aadhaarStatus === 'approved'
              ? 'Verification Approved'
              : verification.aadhaarStatus === 'rejected'
                ? 'Verification Rejected'
                : 'Verification Pending'}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {verification.aadhaarStatus === 'approved'
              ? 'Identity documents verified successfully. Provider has a verified badge.'
              : verification.aadhaarStatus === 'rejected'
                ? verification.adminNotes || 'Documents were not accepted. User can resubmit.'
                : 'Documents are awaiting admin review.'}
          </p>
        </div>
      </div>

      {/* Ijamat status (if applicable) */}
      {verification.ijamatStatus && verification.ijamatStatus !== 'not_submitted' && (
        <div
          className="mt-2 p-2.5 rounded-lg flex items-center gap-2"
          style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--border-default)',
          }}
        >
          <ShieldCheck className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
          <div className="flex-1">
            <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
              Ijamat Card:{' '}
              <span
                style={{
                  color: verification.ijamatStatus === 'approved'
                    ? 'var(--color-success)'
                    : verification.ijamatStatus === 'rejected'
                      ? 'var(--color-danger)'
                      : 'var(--color-warning)',
                }}
              >
                {verification.ijamatStatus.charAt(0).toUpperCase() + verification.ijamatStatus.slice(1)}
              </span>
            </p>
            {verification.ijamatExpiry && (
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                Expires: {new Date(verification.ijamatExpiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
