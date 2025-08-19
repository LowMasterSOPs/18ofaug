/*
  # Create quote_requests table

  1. New Tables
    - `quote_requests`
      - `id` (uuid, primary key)
      - `company` (text, required)
      - `name` (text, required)
      - `email` (text, required)
      - `phone` (text, optional)
      - `postcode` (text, optional)
      - `service` (text, required)
      - `project_details` (text, required)
      - `timeline` (text, optional)
      - `uploaded_files` (jsonb, optional)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `quote_requests` table
    - Add policy for anonymous users to insert quote requests
*/

-- Create quote_requests table
CREATE TABLE IF NOT EXISTS quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company text NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  postcode text,
  service text NOT NULL,
  project_details text NOT NULL,
  timeline text,
  uploaded_files jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE quote_requests ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anonymous users to insert quote requests
CREATE POLICY "Allow anonymous quote submissions"
  ON quote_requests
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create policy to allow authenticated users to read all quotes
CREATE POLICY "Allow authenticated users to read quotes"
  ON quote_requests
  FOR SELECT
  TO authenticated
  USING (true);

-- Create storage bucket for quote files
INSERT INTO storage.buckets (id, name, public)
VALUES ('quote-files', 'quote-files', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy to allow anonymous users to upload files
CREATE POLICY "Allow anonymous file uploads"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'quote-files');

-- Create policy to allow public access to uploaded files
CREATE POLICY "Allow public file access"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'quote-files');