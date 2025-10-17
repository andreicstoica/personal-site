Create a pull request with proper checks and validation.

**Workflow:**
1. Run biome linting and formatting
2. Check for any issues against main branch
3. Build the project to ensure it compiles
4. Show a summary of changes
5. Ask for confirmation before pushing
6. Push branch and create PR with GitHub CLI
7. Return the PR link

**Usage:** `@create-pr "PR title" "PR description"`

**Implementation:**
```bash
#!/bin/bash

# Get PR title and description from arguments
PR_TITLE="$1"
PR_DESCRIPTION="$2"

if [ -z "$PR_TITLE" ]; then
    echo "❌ Error: PR title is required"
    echo "Usage: @create-pr \"PR title\" \"PR description\""
    exit 1
fi

# Set default description if not provided
if [ -z "$PR_DESCRIPTION" ]; then
    PR_DESCRIPTION="Automated PR created via Cursor command"
fi

echo "🚀 Starting PR creation workflow..."

# 1. Run biome linting and formatting
echo "📝 Running biome linting and formatting..."
npx @biomejs/biome check --write .

# Check if biome found any issues
if [ $? -ne 0 ]; then
    echo "⚠️  Biome found issues that were auto-fixed. Please review changes."
fi

# 2. Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "📦 Staging changes..."
    git add .
    git commit -m "chore: auto-format with biome"
fi

# 3. Build the project
echo "🔨 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please fix build errors before creating PR."
    exit 1
fi

# 4. Get current branch name
CURRENT_BRANCH=$(git branch --show-current)

# 5. Check if branch exists on remote
if ! git ls-remote --heads origin "$CURRENT_BRANCH" | grep -q "$CURRENT_BRANCH"; then
    echo "📤 Branch '$CURRENT_BRANCH' doesn't exist on remote yet"
    echo "🔄 Fetching latest from main..."
    git fetch origin main
    
    # Check for conflicts with main
    echo "🔍 Checking for conflicts with main..."
    git merge-base --is-ancestor origin/main HEAD
    if [ $? -ne 0 ]; then
        echo "⚠️  Warning: Current branch may not be up to date with main"
    fi
fi

# 6. Show summary of changes
echo ""
echo "📊 Summary of changes:"
echo "======================"
git diff --stat origin/main...HEAD
echo ""
echo "📝 Recent commits:"
git log --oneline -5
echo ""

# 7. Ask for confirmation
echo "🤔 Ready to create PR?"
echo "Title: $PR_TITLE"
echo "Description: $PR_DESCRIPTION"
echo "Branch: $CURRENT_BRANCH"
echo ""
read -p "Type 'yes' to proceed with push and PR creation: " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ PR creation cancelled"
    exit 0
fi

# 8. Push branch if not already pushed
echo "📤 Pushing branch to remote..."
git push -u origin "$CURRENT_BRANCH"

if [ $? -ne 0 ]; then
    echo "❌ Failed to push branch. Please check your git configuration."
    exit 1
fi

# 9. Create PR with GitHub CLI
echo "🔗 Creating pull request..."
PR_URL=$(gh pr create --title "$PR_TITLE" --body "$PR_DESCRIPTION" --base main)

if [ $? -eq 0 ]; then
    echo "✅ Pull request created successfully!"
    echo "🔗 PR URL: $PR_URL"
else
    echo "❌ Failed to create pull request. Please check your GitHub CLI configuration."
    exit 1
fi
```

**Requirements:**
- GitHub CLI (`gh`) must be installed and authenticated
- Current branch must be different from main
- All changes must be committed or will be auto-committed with biome fixes

**Notes:**
- Automatically runs biome formatting before creating PR
- Builds project to ensure compilation
- Shows diff summary before asking for confirmation
- Never pushes without explicit confirmation
- Returns the PR URL for easy access