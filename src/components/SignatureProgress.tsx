import React from 'react';

interface SignatureProgressProps {
  signatures: {
    approvalSignature?: string;
    bridgeSignature?: string;
    orderSignature: string;
  };
  postInteraction?: {
    target: string;
    data: string;
    description: string;
  };
  isExecuting: boolean;
}

export default function SignatureProgress({ signatures, postInteraction, isExecuting }: SignatureProgressProps) {
  const signatureSteps = [
    { name: 'Token Approval', key: 'approvalSignature', icon: '🔐', description: 'Approve token spending' },
    { name: 'Bridge Transaction', key: 'bridgeSignature', icon: '🌉', description: 'Sign bridge transaction' },
    { name: 'Order Commitment', key: 'orderSignature', icon: '📋', description: 'Confirm order details' }
  ];

  return (
    <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
      <h3 className="text-lg font-bold text-gray-800 mb-4">🖊️ Signature Progress</h3>
      
      {/* Signature Steps */}
      <div className="space-y-3 mb-6">
        {signatureSteps.map((step, index) => {
          const isCompleted = signatures[step.key as keyof typeof signatures];
          const isCurrent = !isCompleted && (signatures[signatureSteps[index - 1]?.key as keyof typeof signatures] || index === 0);
          
          return (
            <div key={step.key} className={`flex items-center p-3 rounded-lg transition-all ${
              isCompleted 
                ? 'bg-green-50 border border-green-200' 
                : isCurrent 
                ? 'bg-blue-50 border border-blue-200 animate-pulse' 
                : 'bg-gray-50 border border-gray-200'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                isCompleted 
                  ? 'bg-green-500 text-white' 
                  : isCurrent 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-300 text-gray-600'
              }`}>
                {isCompleted ? '✅' : isCurrent ? '⏳' : step.icon}
              </div>
              
              <div className="flex-1">
                <div className={`font-medium ${
                  isCompleted ? 'text-green-800' : isCurrent ? 'text-blue-800' : 'text-gray-600'
                }`}>
                  {step.name}
                </div>
                <div className={`text-sm ${
                  isCompleted ? 'text-green-600' : isCurrent ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {isCompleted ? 'Signed successfully' : step.description}
                </div>
              </div>
              
              {isCompleted && (
                <div className="text-xs text-green-600 font-mono">
                  {(signatures[step.key as keyof typeof signatures] as string)?.slice(0, 10)}...
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Post-Interaction Section */}
      {postInteraction && (
        <div className="border-t border-gray-200 pt-4">
          <h4 className="font-semibold text-gray-800 mb-3">🔧 Post-Bridge Action</h4>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white mr-3 mt-0.5">
                ⚙️
              </div>
              <div className="flex-1">
                <div className="font-medium text-purple-800 mb-1">
                  {postInteraction.description}
                </div>
                <div className="text-sm text-purple-600 mb-2">
                  Contract: {postInteraction.target}
                </div>
                <div className="text-xs text-purple-500 font-mono bg-purple-100 p-2 rounded">
                  {postInteraction.data.slice(0, 40)}...
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Execution Status */}
      {isExecuting && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-500 mr-3"></div>
            <span className="text-yellow-800 font-medium">Executing bridge transaction...</span>
          </div>
        </div>
      )}
    </div>
  );
} 