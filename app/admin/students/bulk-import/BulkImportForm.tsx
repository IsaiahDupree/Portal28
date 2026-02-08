"use client";

import { useState } from "react";
import { Upload, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface ImportResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{
    row: number;
    email: string;
    error: string;
  }>;
  created: Array<{
    email: string;
    course_title: string;
  }>;
}

export function BulkImportForm() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".csv")) {
        setError("Please select a CSV file");
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setError("Please select a file");
      return;
    }

    setIsUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/students/bulk-import", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Import failed");
      }

      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Upload CSV File
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="csv-file"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Select CSV File
          </label>
          <input
            type="file"
            id="csv-file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={isUploading}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-green-50 file:text-green-700
              hover:file:bg-green-100
              disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {file && (
            <p className="mt-2 text-sm text-gray-600">
              Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!file || isUploading}
            className="flex-1 px-6 py-3 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            {isUploading ? "Importing..." : "Import Students"}
          </button>

          {(file || result) && (
            <button
              type="button"
              onClick={handleReset}
              disabled={isUploading}
              className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reset
            </button>
          )}
        </div>
      </form>

      {result && (
        <div className="mt-6 space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">
                {result.total}
              </div>
              <div className="text-sm text-gray-600">Total Rows</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-700">
                {result.successful}
              </div>
              <div className="text-sm text-green-700">Successful</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-700">
                {result.failed}
              </div>
              <div className="text-sm text-red-700">Failed</div>
            </div>
          </div>

          {/* Successful imports */}
          {result.created.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Successfully Imported ({result.created.length})
              </h3>
              <div className="bg-green-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                <div className="space-y-2">
                  {result.created.map((item, index) => (
                    <div
                      key={index}
                      className="text-sm text-green-800 flex items-start gap-2"
                    >
                      <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>{item.email}</strong> → {item.course_title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Errors */}
          {result.errors.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-600" />
                Errors ({result.errors.length})
              </h3>
              <div className="bg-red-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                <div className="space-y-2">
                  {result.errors.map((item, index) => (
                    <div
                      key={index}
                      className="text-sm text-red-800 flex items-start gap-2"
                    >
                      <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Row {item.row}:</strong> {item.email} - {item.error}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
