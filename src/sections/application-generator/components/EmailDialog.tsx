import { useState } from 'react';
import { X, Mail, Send, AlertCircle, CheckCircle, Paperclip } from 'lucide-react';
import type { GeneratedApplication, ApplicationVariant } from '../types';

interface EmailDialogProps {
  /** The application being sent */
  application: GeneratedApplication;
  /** The selected variant */
  selectedVariant: ApplicationVariant;
  /** Whether the dialog is open */
  open: boolean;
  /** Called when the dialog should close */
  onClose: () => void;
  /** Called when the email is sent successfully */
  onEmailSent?: (emailId: string) => void;
}

/**
 * Dialog for composing and sending job application emails
 *
 * Features:
 * - Pre-filled subject and body from cover letter
 * - Email validation
 * - Attachment selection (resume/cover letter)
 * - Loading states during send
 * - Success/error feedback
 */
export function EmailDialog({
  application,
  selectedVariant,
  open,
  onClose,
  onEmailSent,
}: EmailDialogProps) {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState(
    `Application for ${application.jobTitle} at ${application.company}`
  );
  const [body, setBody] = useState(selectedVariant.coverLetter);
  const [includeResume, setIncludeResume] = useState(true);
  const [includeCoverLetter, setIncludeCoverLetter] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Email validation
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSend = async () => {
    // Reset states
    setError(null);
    setSuccess(false);

    // Validate email
    if (!recipientEmail.trim()) {
      setError('Please enter a recipient email address');
      return;
    }

    if (!isValidEmail(recipientEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!subject.trim()) {
      setError('Please enter a subject line');
      return;
    }

    if (!body.trim()) {
      setError('Please enter a message body');
      return;
    }

    try {
      setSending(true);

      // Import Firebase Functions
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions();

      // Call Cloud Function to send email
      const sendApplicationEmail = httpsCallable(functions, 'sendApplicationEmail');
      const result = await sendApplicationEmail({
        applicationId: application.id,
        recipientEmail: recipientEmail.trim(),
        subject: subject.trim(),
        body: body.trim(),
        includeResume,
        includeCoverLetter,
      });

      const data = result.data as { success: boolean; emailId?: string; message: string };

      if (data.success) {
        setSuccess(true);
        onEmailSent?.(data.emailId || '');

        // Close dialog after brief delay
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError(data.message || 'Failed to send email');
      }
    } catch (err: any) {
      console.error('Error sending email:', err);
      setError(err.message || 'An unexpected error occurred while sending email');
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950/30 flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
                Send Application via Email
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {application.jobTitle} at {application.company}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
            disabled={sending}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {/* Success Message */}
          {success && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-emerald-900 dark:text-emerald-100">
                  Email sent successfully!
                </h3>
                <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
                  Your application has been sent to {recipientEmail}
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 dark:text-red-100">
                  Failed to send email
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Recipient Email */}
          <div>
            <label
              htmlFor="recipient-email"
              className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
            >
              Recipient Email <span className="text-red-500">*</span>
            </label>
            <input
              id="recipient-email"
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="hiring.manager@company.com"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={sending || success}
              autoFocus
            />
          </div>

          {/* Subject */}
          <div>
            <label
              htmlFor="subject"
              className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
            >
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Application for [Position] at [Company]"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={sending || success}
            />
          </div>

          {/* Body */}
          <div>
            <label
              htmlFor="body"
              className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
            >
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              placeholder="Your cover letter message..."
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-['Georgia',serif] leading-relaxed"
              disabled={sending || success}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Pre-filled with your cover letter. Feel free to customize before sending.
            </p>
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              Attachments
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <input
                  type="checkbox"
                  checked={includeResume}
                  onChange={(e) => setIncludeResume(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600"
                  disabled={sending || success}
                />
                <Paperclip className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Resume.pdf <span className="text-slate-500 dark:text-slate-400">(Coming soon)</span>
                </span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <input
                  type="checkbox"
                  checked={includeCoverLetter}
                  onChange={(e) => setIncludeCoverLetter(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600"
                  disabled={sending || success}
                />
                <Paperclip className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  CoverLetter.pdf <span className="text-slate-500 dark:text-slate-400">(Coming soon)</span>
                </span>
              </label>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Note: PDF generation is not yet implemented. Email will be sent without attachments.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Rate limit: 10 emails per hour
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors"
              disabled={sending}
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending || success}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {sending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </>
              ) : success ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Sent
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Email
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
