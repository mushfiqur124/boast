# 🏆 Boast - Team Competition Management App

**The ultimate app for organizing epic friend group competitions like "Dawg Olympics"**

Boast helps groups of friends organize team-based competitions where participants are drafted into teams, compete in various activities, and track scores with complete transparency. Perfect for events like olympics-style competitions, game nights, sports tournaments, or any competitive gathering.

## 🎯 What Does Boast Do?

### Core Concept
Split your friend group into teams, draft players, compete in activities, and track comprehensive scores with real-time leaderboards and transparent point allocation.

### 🌟 Key Features

#### 1. **Competition Management**
- Create competitions with unique 6-character codes
- Join existing competitions using codes
- No authentication required - purely code-based access
- Perfect for spontaneous events and gatherings

#### 2. **Smart Team Drafting System**
- Add participants to a draft pool
- Designate team captains (automatically creates teams)
- **Coin flip mechanism** for determining draft order
- Drag-and-drop player assignment interface
- Real-time draft status tracking
- Support for 2 teams per competition

#### 3. **Flexible Activity System**
- **Team-based activities**: Competitions where teams compete as units (e.g., Beer Pong, Flag Football)
- **Individual activities**: Personal performance that contributes to team totals (e.g., Push-ups, Sprint times)
- Preset activity templates for common competitions
- Custom activity creation with configurable units
- Activity completion tracking

#### 4. **Advanced Scoring System**
- **Configurable scoring rules**:
  - Team win/loss points (default: 50/0)
  - Individual placement bonuses (1st: +10, 2nd: +5, Last: -5)
- Support for negative points (penalties)
- **Two scoring modes**:
  - **Win/Loss mode**: Simple winner selection
  - **Custom scoring**: Direct point entry for complex scoring
- Automatic calculation of team totals
- Individual score tracking with team aggregation

#### 5. **Transparent Point Tracking**
- **Activity-level transparency**: See exactly how many points each team gained/lost per activity
- Color-coded badges showing net point changes (green for gains, red for losses)
- Complete audit trail of all scoring decisions
- Real-time leaderboard updates

#### 6. **Interactive Individual Leaderboards**
- **Visual podium** showing top 3 individual performers
- Gold/silver/bronze podium with hover animations
- Complete individual rankings for all participants
- Team attribution for each participant
- Real-time updates as scores are entered

#### 7. **Comprehensive Dashboard**
- Live team leaderboard with current standings
- Activity completion status overview
- Participant statistics and team composition
- Competition overview metrics
- Real-time score updates across all devices

## 🛠️ Development Journey

This project was **initially prototyped using Lovable** for rapid iteration and feature exploration, then **brought into Cursor for advanced development** and fine-tuning. This hybrid approach allowed for:

- **Rapid prototyping** with Lovable's AI-assisted development
- **Detailed customization** and advanced features in Cursor
- **Best of both worlds**: Speed + precision

## 🏗️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Library**: shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with custom theming
- **Database**: Supabase (PostgreSQL with real-time features)
- **State Management**: React Query (@tanstack/react-query) for server state
- **Routing**: React Router DOM
- **Icons**: Lucide React
- **Notifications**: Sonner toasts

## 📊 Database Schema

### Core Tables
- **competitions**: Main competition instances with unique codes
- **teams**: Team data (2 teams per competition) with captains and scores
- **participants**: Individual players assigned to teams
- **activities**: Competition events (team-based or individual scoring)
- **scores**: Results tracking with support for both team and individual scores

### Key Relationships
- Competition → Teams (1:many)
- Teams → Participants (1:many)
- Competition → Activities (1:many)
- Activities → Scores (1:many)
- Scores can link to either Teams or Participants

## 🎮 How to Use

1. **Create a Competition**: Set up a new competition with a unique code
2. **Add Participants**: Build your draft pool with all players
3. **Draft Teams**: Designate captains and use the coin flip + draft system
4. **Set Up Activities**: Add team or individual activities for your event
5. **Configure Scoring**: Set up scoring rules and bonuses
6. **Compete & Score**: Enter results as activities are completed
7. **Track Progress**: Monitor live leaderboards and transparent scoring

## 🚀 Getting Started

### Prerequisites
- Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Setup
```sh
# Clone the repository
git clone https://github.com/mushfiqur124/boast.git

# Navigate to project directory
cd boast

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Setup

**⚠️ REQUIRED: Supabase Configuration**

This app requires Supabase credentials to function. You must set up your environment variables:

```sh
# Copy the example environment file
cp .env.example .env

# Edit .env and add your Supabase credentials
# VITE_SUPABASE_URL=https://your-project-id.supabase.co
# VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

**Getting Supabase Credentials:**
1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings → API 
4. Copy your Project URL and anon/public key
5. Add them to your `.env` file

**Security Notes:**
- Database migrations are in `supabase/migrations/`
- **Never commit .env files to version control**
- Environment variables are required - no fallback credentials for security
- Always use your own Supabase project for development

## 🎨 Design Philosophy

- **KISS Principle**: Keep It Simple, Stupid - always choose the simplest solution that works
- **Real-time transparency**: Complete visibility into scoring and point allocation
- **Mobile-first**: Responsive design for on-the-go competition management
- **No authentication**: Code-based access for frictionless event participation
- **Engaging UX**: Fun animations and visual elements while maintaining clean design

## 🔮 Future Enhancements

- Export to CSV functionality
- Photo uploads for activities
- Advanced analytics and statistics
- Custom competition templates
- Multi-round tournament support
- Integration with social platforms

## 🤝 Contributing

This project follows the KISS principle - prefer simple, readable code over complex abstractions. When making changes, consider downstream effects and related impacts.

## 📝 License

This project is open source and available under the MIT License.

---

**Ready to turn your next friend gathering into an epic competition? Let's Boast about it! 🏆**
