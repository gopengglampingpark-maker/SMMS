<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="https://lucide.dev/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>GGPH SMMS</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
       /* Custom scrollbar */
       ::-webkit-scrollbar {
         width: 8px;
         height: 8px;
       }
       ::-webkit-scrollbar-track {
         background: #f1f5f9; 
       }
       ::-webkit-scrollbar-thumb {
         background: #cbd5e1; 
         border-radius: 4px;
       }
       ::-webkit-scrollbar-thumb:hover {
         background: #94a3b8; 
       }
       
       @keyframes fadeIn {
         from { opacity: 0; transform: translateY(10px); }
         to { opacity: 1; transform: translateY(0); }
       }
       .animate-fadeIn {
         animation: fadeIn 0.3s ease-out forwards;
       }
       
       /* Spinner */
       .loader {
          border: 3px solid #f3f3f3;
          border-radius: 50%;
          border-top: 3px solid #059669;
          width: 24px;
          height: 24px;
          -webkit-animation: spin 1s linear infinite; /* Safari */
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
    </style>
</head>
  <body class="bg-slate-50 text-slate-900 antialiased">
    <div id="root"></div>
  </body>
</html>