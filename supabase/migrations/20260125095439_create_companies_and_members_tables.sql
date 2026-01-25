/*
  # Create Companies and Members Tables

  1. New Tables
    - `companies`
      - `id` (text, primary key) - Company ID
      - `name` (text) - Company name
      - `created_at` (timestamptz) - Creation timestamp
      - `created_by` (text) - Email of creator

    - `company_members`
      - `id` (uuid, primary key) - Member record ID
      - `company_id` (text, foreign key) - Reference to companies
      - `email` (text) - Member email
      - `role` (text) - Member role (owner, member)
      - `added_by` (text) - Email of person who added them
      - `created_at` (timestamptz) - Creation timestamp

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their companies
*/

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id text PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by text NOT NULL
);

-- Create company_members table
CREATE TABLE IF NOT EXISTS company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  added_by text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, email)
);

-- Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;

-- Policies for companies table
CREATE POLICY "Users can view companies they are members of"
  ON companies FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM company_members WHERE email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "Users can create companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Company owners can update their companies"
  ON companies FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM company_members 
      WHERE email = auth.jwt()->>'email' AND role = 'owner'
    )
  );

-- Policies for company_members table
CREATE POLICY "Users can view members of their companies"
  ON company_members FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "Company owners can add members"
  ON company_members FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE email = auth.jwt()->>'email' AND role = 'owner'
    )
  );

CREATE POLICY "Company owners can remove members"
  ON company_members FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE email = auth.jwt()->>'email' AND role = 'owner'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_company_members_company_id ON company_members(company_id);
CREATE INDEX IF NOT EXISTS idx_company_members_email ON company_members(email);
