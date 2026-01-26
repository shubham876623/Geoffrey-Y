import { FiAlertCircle, FiSettings } from 'react-icons/fi'

const ErrorDisplay = ({ title, message, details }) => {
  return (
    <div className="min-h-screen bg-gray-800 text-white flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-gray-900 rounded-lg shadow-xl border border-gray-700 p-8">
        <div className="flex items-center gap-4 mb-6">
          <FiAlertCircle className="text-5xl text-red-500" />
          <h1 className="text-3xl font-bold text-white">{title}</h1>
        </div>
        
        <div className="space-y-4">
          <p className="text-gray-300 text-lg">{message}</p>
          
          {details && (



            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <p className="text-gray-400 text-sm font-mono whitespace-pre-wrap">{details}</p>
            </div>
          )}
          
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 mt-6">
            <div className="flex items-start gap-3">
              <FiSettings className="text-blue-400 mt-1" />
              
              <div>
                <h3 className="text-blue-400 font-semibold mb-2">How to Fix:</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-300 text-sm">
                  <li>Create a <code className="bg-gray-700 px-2 py-1 rounded">.env</code> file in the <code className="bg-gray-700 px-2 py-1 rounded">frontend</code> directory</li>
                  <li>Add your Supabase credentials:
                    <pre className="bg-gray-900 mt-2 p-3 rounded text-xs overflow-x-auto">
{`VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_KEY=your_supabase_anon_key
VITE_API_BASE_URL=http://localhost:8000
VITE_KDS_API_KEY=your_kds_api_key`}
                    </pre>
                  </li>
                  <li>Restart the development server</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ErrorDisplay

