const Project = require('../models/Project');

// GET LIVE COMMIT HISTORY FROM GITHUB API
exports.getCommits = async (req, res) => {
  try {
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({ message: "Project ID is required." });
    }

    // 1. Fetch the project
    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    if (!project.githubRepo) {
      return res.status(400).json({ message: "No GitHub repository linked to this project." });
    }

    // 🛑 FOOLPROOF FIX 1: Auto-Clean the Repo String
    // If a user pasted "https://github.com/KVKMadithya/collabboard", this converts it strictly to "KVKMadithya/collabboard"
    let repoString = project.githubRepo.trim();
    if (repoString.includes('github.com/')) {
      repoString = repoString.split('github.com/')[1];
    }
    // Remove any trailing slashes or .git extensions
    repoString = repoString.replace(/\/$/, '').replace(/\.git$/, '');

    // 2. Set up headers
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'CollaBoard-App'
    };

    if (process.env.GITHUB_PAT) {
      headers['Authorization'] = `Bearer ${process.env.GITHUB_PAT}`;
    }

    // 3. Ping the official GitHub API
    const response = await fetch(`https://api.github.com/repos/${repoString}/commits`, {
      method: 'GET',
      headers: headers
    });

    // 🛑 FOOLPROOF FIX 2: Gracefully handle all GitHub API rejections without crashing
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("GitHub API Rejected Request:", errorData);

      if (response.status === 404) {
        return res.status(404).json({ message: "Repository not found. Ensure it is public, or that you have a valid GITHUB_PAT configured." });
      }
      if (response.status === 403) {
        return res.status(403).json({ message: "GitHub API rate limit exceeded. Please add a GITHUB_PAT to your backend .env file." });
      }
      if (response.status === 401) {
        return res.status(401).json({ message: "Unauthorized. Your GITHUB_PAT is invalid or expired." });
      }
      if (response.status === 409) {
        return res.status(200).json([]); // 409 means the repository is totally empty (no commits yet)
      }
      
      throw new Error(`GitHub API Error ${response.status}: ${errorData.message || 'Unknown'}`);
    }

    const rawCommits = await response.json();

    // 🛑 FOOLPROOF FIX 3: Ensure the API actually returned an array before we try to map it
    if (!Array.isArray(rawCommits)) {
      console.error("GitHub returned unexpected data format:", rawCommits);
      return res.status(200).json([]);
    }

    // 4. Map the payload safely
    const formattedCommits = rawCommits.map(commitData => ({
      sha: commitData.sha,
      message: commitData.commit?.message || 'No commit message',
      authorName: commitData.commit?.author?.name || 'Unknown',
      authorEmail: commitData.commit?.author?.email || 'Unknown',
      date: commitData.commit?.author?.date || new Date(),
      avatarUrl: commitData.author?.avatar_url || null, 
      commitUrl: commitData.html_url
    }));

    res.status(200).json(formattedCommits);

  } catch (error) {
    // 🛑 If this still fails, it will now print the EXACT reason in your Railway logs
    console.error("GitHub Fetch Critical Error:", error);
    res.status(500).json({ message: "Server error fetching GitHub commits.", error: error.message });
  }
};