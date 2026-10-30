# ContextFlow – AI-Powered Knowledge & Task Management Platform

> Never lose context when work changes hands.

ContextFlow is an AI-powered knowledge and task management platform designed to maintain continuity across meetings, team transitions and work handovers. It transforms unstructured meeting notes and team documents into structured knowledge, actionable tasks and contextual summaries.

Built as part of the **DigiPlus Technical Assessment – 30 October 2026**.

---

## 1. Problem Statement

Teams frequently lose important information when responsibilities change hands. Meeting decisions remain buried in notes, action items go unassigned, employees miss discussions, and pending tasks are forgotten during transitions.

ContextFlow addresses this problem by capturing meeting context, extracting actionable information using AI, tracking task progress and providing intelligent handover summaries.

## 2. Key Features

### 2.1 Meeting Management
- Create and manage meetings and work transfers.
- Maintain agendas, participants and meeting notes.
- Record decisions and meeting outcomes.
- Access historical meeting information.

### 2.2 AI-Powered Meeting Intelligence
Transform raw, unstructured meeting notes into structured information.

AI generates:
- Meeting summaries.
- Key decisions.
- Action items.
- Suggested task owners.
- Due dates when supported by the discussion.

Users can review extracted information before saving it.

### 2.3 Action Item Lifecycle Management
- Assign tasks to team members.
- Set due dates and priorities.
- Track task status: Pending, In Progress and Completed.
- Record task outcomes.
- Identify overdue and unassigned tasks.

### 2.4 Intelligent Task Carry-Forward
Open action items can be transferred to subsequent meetings or work transfers.

The platform preserves their original context and history instead of creating disconnected duplicate tasks.

### 2.5 AI Catch-Up Brief
Generate concise, contextual summaries for people who missed a meeting or are taking over responsibilities.

The brief highlights:
- What happened.
- Important decisions.
- Outstanding responsibilities.
- Pending tasks.
- Relevant historical context.

### 2.6 Knowledge Base
Maintain a centralized collection of team documents and previous meeting information.

AI can use relevant knowledge to connect current discussions with existing organizational context.

### 2.7 Handover Risk Intelligence – Special Feature
ContextFlow introduces an additional intelligence layer to identify potential handover risks.

It highlights:
- Overdue action items.
- Tasks without assigned owners.
- Repeatedly carried-forward tasks.
- Decisions without associated action items.
- Missing context during work transitions.

The feature helps teams identify potential continuity gaps before they become operational problems.

---

## 3. Technology Stack

| Component | Technology |
|---|---|
| Frontend | Next.js |
| Styling | Tailwind CSS |
| Backend | Next.js API Routes |
| Database | Supabase PostgreSQL |
| AI Integration | OpenRouter API |
| AI Model | Flint 40B Free |
| Version Control | Git and GitHub |
| Deployment | Vercel |

### Why this stack?

- Next.js provides frontend and backend functionality within one application.
- Supabase provides PostgreSQL-based persistent storage.
- OpenRouter provides access to AI models through a unified API.
- Tailwind CSS enables rapid development of responsive interfaces.
- Vercel simplifies application deployment.

---

## 4. AI Architecture and Workflow

The AI functionality is designed around two primary workflows.

### Workflow A: Meeting Intelligence

1. User submits raw meeting notes.
2. Backend validates the input.
3. Relevant historical context is retrieved when available.
4. The AI model processes the information.
5. Structured output is generated containing:
   - Summary
   - Decisions
   - Action items
   - Suggested owners
   - Due dates
6. Backend validates the AI response.
7. User reviews and confirms the extracted information.
8. Approved information is persisted in Supabase.

### Workflow B: Contextual Catch-Up

1. User selects a meeting or work transfer.
2. Application retrieves relevant meeting information and outstanding tasks.
3. Context is provided to the AI model.
4. AI generates a concise catch-up brief.
5. The user receives a contextual overview of decisions, responsibilities and pending work.

### AI Reliability

The application should handle:
- Invalid model responses.
- Missing information.
- API timeouts.
- Rate limits.
- Provider failures.

AI-generated suggestions should not automatically be treated as confirmed decisions or assignments.

---

## 5. Database and Data Management

Supabase PostgreSQL is used for persistent application data.

The database design should support the following entities:

| Entity | Purpose |
|---|---|
| Meetings | Meeting details and agendas |
| Participants | Meeting participants |
| Decisions | Recorded meeting decisions |
| Action Items | Tasks, owners, due dates and statuses |
| Task History | Assignment, status and carry-forward history |
| Knowledge Documents | Team knowledge and historical documents |

Relationships between meetings, decisions and action items preserve historical context across work transfers.

The actual database schema is maintained through SQL migrations.

---

## 6. Logging and Monitoring

ContextFlow implements structured application logging to improve traceability and debugging.

The logging system covers:

- Appropriate log levels.
- Unique correlation/request IDs.
- Meeting creation events.
- Task creation, reassignment and closure.
- AI API calls.
- AI request latency and outcome.
- Errors with relevant execution context.
- Structured log output to files.

Sensitive information, API keys and credentials must never be written to application logs.

---

## 7. Installation and Local Setup

### Prerequisites

- Node.js and npm.
- Git.
- Supabase account.
- OpenRouter account.
- GitHub account.

### Step 1: Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd contextflow
```

### Step 2: Install dependencies

```bash
npm install
```

### Step 3: Configure environment variables

Create a `.env.local` file in the project root.

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_publishable_key

SUPABASE_SECRET_KEY=your_supabase_secret_key

OPENROUTER_API_KEY=your_openrouter_api_key
```

Use the exact environment variable names expected by the application code. Never expose the Supabase secret key or OpenRouter API key to the browser.

### Step 4: Configure the database

1. Open your Supabase project.
2. Navigate to SQL Editor.
3. Open a new SQL query.
4. Execute the SQL migration files in the required order.
5. Verify that the required database tables have been created.

### Step 5: Start the development server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

### Step 6: Build verification

```bash
npm run build
```

Ensure the production build completes successfully before deployment.

---

## 8. Deployment

The application is deployed using Vercel.

Deployment process:

1. Push the source code to GitHub.
2. Import the GitHub repository into Vercel.
3. Configure the required environment variables in Vercel project settings.
4. Deploy the application.
5. Verify the production build.
6. Test the deployed application and its database connectivity.

**GitHub Repository:** [https://github.com/Sagar-7845/ContextFlow/edit/main/README.md]

---

## 9. Security and Error Handling

- Environment variables are used for sensitive credentials.
- Secret API keys remain server-side.
- User inputs are validated before processing.
- AI-generated outputs are validated before persistence.
- API failures are handled gracefully.
- Database errors are handled without exposing sensitive details.
- Secrets are excluded from Git commits.

---

## 10. Assumptions and Limitations

The application is developed within a limited technical assessment timeframe.

Potential limitations include:

- AI-generated owners and deadlines may require human verification.
- AI model availability and rate limits depend on the provider.
- Knowledge retrieval quality depends on the available documents and meeting history.
- The initial implementation focuses on essential team handover workflows rather than enterprise-scale collaboration.
- Advanced integrations with external meeting platforms, email systems and calendar services are outside the initial MVP scope.

Update this section to reflect the limitations verified in the final implementation.

---

## 11. Future Enhancements

- Calendar and meeting platform integrations.
- Automated task reminders.
- Email-based handover notifications.
- Advanced semantic search across organizational knowledge.
- Role-based access control.
- Team-level analytics and performance insights.

---

## 12. Project Objective

ContextFlow demonstrates how AI can be integrated into everyday team workflows to reduce information loss, improve accountability and maintain continuity during meetings and work transitions.

Rather than simply storing meeting notes, ContextFlow transforms discussions into structured knowledge and actionable responsibilities.

**Built for the DigiPlus Technical Assessment | 30 October 2026**
