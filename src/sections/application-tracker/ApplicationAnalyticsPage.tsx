import { TrendingUp, Calendar, Target, Award, BarChart3 } from 'lucide-react'

export default function ApplicationAnalyticsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-50 dark:from-slate-950 dark:via-blue-950/10 dark:to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-50 mb-2 tracking-tight">
            Application Analytics
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Track your job search performance and insights
          </p>
        </div>

        {/* Coming Soon Message */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-12">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 mb-6">
              <BarChart3 className="w-10 h-10 text-white" />
            </div>

            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-4">
              Analytics Dashboard Coming Soon
            </h2>

            <p className="text-slate-600 dark:text-slate-400 mb-8">
              We're building powerful analytics to help you track your job search performance,
              response rates, and optimize your application strategy.
            </p>

            {/* Feature Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950/30 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-50">Response Rates</h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 text-left">
                  Track how often companies respond to your applications
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-50">Time to Response</h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 text-left">
                  Average time from application to first response
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-950/30 flex items-center justify-center">
                    <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-50">Match Score Impact</h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 text-left">
                  Success rates by job match score ranges
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-950/30 flex items-center justify-center">
                    <Award className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-50">Top Variants</h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 text-left">
                  Which resume/cover letter variants perform best
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>
              <span>In Development</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
