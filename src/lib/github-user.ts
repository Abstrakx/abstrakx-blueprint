import { Octokit } from 'octokit';

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  description: string | null;
}

/**
 * Fetches the repositories accessible to the authenticated user.
 */
export async function fetchUserRepos(token: string): Promise<GitHubRepo[]> {
  try {
    const octokit = new Octokit({ auth: token });
    // Fetch user's repos. Using type=all to ensure private + public repos are fetched.
    const response = await octokit.rest.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 100,
    });

    return response.data.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      private: repo.private,
      default_branch: repo.default_branch || 'main',
      description: repo.description,
    }));
  } catch (error) {
    console.error('Error fetching user repositories from GitHub:', error);
    throw error;
  }
}

/**
 * Fetches the branches for a specific repository.
 */
export async function fetchRepoBranches(
  token: string,
  owner: string,
  repo: string
): Promise<string[]> {
  try {
    const octokit = new Octokit({ auth: token });
    const response = await octokit.rest.repos.listBranches({
      owner,
      repo,
      per_page: 100,
    });

    return response.data.map((branch: any) => branch.name);
  } catch (error) {
    console.error(`Error fetching branches for repository ${owner}/${repo}:`, error);
    throw error;
  }
}
