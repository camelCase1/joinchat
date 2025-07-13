'use client';

import { useSocket } from '~/hooks/useSocket';

export function ConnectionStatus() {
  const { socket, connected } = useSocket();

  if (!socket) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
        connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            connected ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <span>
            {connected ? 'Connected' : 'Connecting...'}
          </span>
        </div>
        {socket && socket.id && (
          <div className="text-xs opacity-75 mt-1">
            ID: {socket.id.slice(0, 8)}...
          </div>
        )}
        {!connected && (
          <div className="text-xs opacity-75 mt-1">
            Trying to reach server...
          </div>
        )}
      </div>
    </div>
  );
}