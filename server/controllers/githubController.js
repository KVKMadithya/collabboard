const Project = require('../models/Project');

// GET LIVE COMMIT HISTORY FROM GITHUB API
exports.getCommits = async (req, res) => {
  try {
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({ message: "Project ID is required." });
    }

    // 1. Fetch the project to get the linked repository string
    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    if (!project.githubRepo) {
      return res.status(400).json({ message: "No GitHub repository linked to this project." });
    }

    // 2. Set up headers (Includes Personal Access Token if available to bypass rate limits)
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'CollaBoard-App'
    };

    if (process.env.GITHUB_PAT) {
      headers['Authorization'] = `Bearer ${process.env.GITHUB_PAT}`;
    }

    // 3. Ping the official GitHub API for the latest commits
    const response = await fetch(`https://api.github.com/repos/${project.githubRepo}/commits`, {
      method: 'GET',
      headers: headers
    });

    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ message: "GitHub repository not found or is private without a valid PAT." });
      }
      if (response.status === 403) {
        return res.status(403).json({ message: "GitHub API rate limit exceeded. Please configure a GITHUB_PAT in your backend .env file." });
      }
      throw new Error("Failed to fetch from GitHub.");
    }

    const rawCommits = await response.json();

    // 4. Map the payload to extract exactly what the frontend needs
    const formattedCommits = rawCommits.map(commitData => ({
      sha: commitData.sha,
      message: commitData.commit.message,
      authorName: commitData.commit.author.name,
      authorEmail: commitData.commit.author.email,
      date: commitData.commit.author.date,
      avatarUrl: commitData.author?.avatar_url || null, 
      commitUrl: commitData.html_url
    }));

    res.status(200).json(formattedCommits);

  } catch (error) {
    console.error("GitHub Fetch Error:", error);
    res.status(500).json({ message: "Server error fetching GitHub commits.", error: error.message });
  }
};