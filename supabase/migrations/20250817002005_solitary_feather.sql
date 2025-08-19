/*
  # Quote Requests System Setup

  1. New Tables
    - `quote_requests`
      - `id` (uuid, primary key, auto-generated)
      - `company` (text, required)
      - `name` (text, required)
      - `email` (text, required)
      - `phone` (text, optional)
      - `postcode` (text, optional)
      - `service` (text, required)
      - `project_details` (text, required)
      - `timeline` (text, optional)
      - `uploaded_files` (jsonb, optional) - stores file metadata as JSON
      - `created_at` (timestamptz, auto-generated)

  2. Storage
    - Create `quote-files` bucket for file uploads
    - Set up public access for uploaded files

  3. Security
    - Enable RLS on `quote_requests` table
    - Add policies for anonymous users to insert quote requests
    - Set up storage policies for file uploads

  4. Indexes
    - Index on email for faster lookups
    - Index on created_at for sorting
*/

-- Create the quote_requests table
CREATE TABLE IF NOT EXISTS quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company text NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text DEFAULT NULL,
  postcode text DEFAULT NULL,
  service text NOT NULL,
  project_details text NOT NULL,
  timeline text DEFAULT NULL,
  uploaded_files jsonb DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE quote_requests ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anonymous users to insert quote requests
CREATE POLICY "Anyone can submit quote requests"
  ON quote_requests
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create policy to allow authenticated users to read all quote requests
CREATE POLICY "Authenticated users can read quote requests"
  ON quote_requests
  FOR SELECT
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS quote_requests_email_idx ON quote_requests (email);
CREATE INDEX IF NOT EXISTS quote_requests_created_at_idx ON quote_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS quote_requests_service_idx ON quote_requests (service);

-- Create storage bucket for quote files
INSERT INTO storage.buckets (id, name, public)
VALUES ('quote-files', 'quote-files', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy to allow anonymous users to upload files
CREATE POLICY IF NOT EXISTS "Anyone can upload quote files"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'quote-files');

-- Create storage policy to allow public access to uploaded files
CREATE POLICY IF NOT EXISTS "Quote files are publicly accessible"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'quote-files');