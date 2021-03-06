export namespace PresetHubServerTypes {
  export type GetDistinctedProjectIdsResponse = {
    projectIds?: string[] | null;
  };

  export type PublicProfileInfomation = {
    id: string;
    name: string;
    description: string;
    projectId: string;
    data: string;
    lastUpdate: string;
    userId: string;
    userDisplayName: string;
    loginProvider: string | null;
    showLinkId: boolean | null;
  };

  export type GetPublicProfilesResponse = {
    profiles?: PublicProfileInfomation[] | null;
  };
}
