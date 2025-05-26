import { PublicClientApplication, InteractionType } from '@azure/msal-browser';
import { Client } from '@microsoft/microsoft-graph-client';
import { AuthCodeMSALBrowserAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/authCodeMsalBrowser';

// MSAL configuration
const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || 'your-client-id-here', // Replace with your Azure App Registration client ID
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: window.location.origin
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  }
};

// Create MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

// Graph API scopes
const scopes = [
  'Files.Read',
  'Files.Read.All',
  'User.Read'
];

export interface OneDriveItem {
  id: string;
  name: string;
  folder?: {
    childCount: number;
  };
  file?: {
    mimeType: string;
  };
  webUrl: string;
  parentReference?: {
    path: string;
  };
  '@microsoft.graph.downloadUrl'?: string;
}

export interface OneDriveImage {
  id: string;
  name: string;
  src: string;
  alt: string;
  thumbnail?: string;
  webUrl: string;
}

class OneDriveAuthService {
  private graphClient: Client | null = null;
  private isAuthenticated = false;

  async initialize() {
    try {
      await msalInstance.initialize();
      return true;
    } catch (error) {
      console.error('Failed to initialize MSAL:', error);
      return false;
    }
  }

  async login(): Promise<boolean> {
    try {
      const loginResponse = await msalInstance.loginPopup({
        scopes: scopes,
        prompt: 'select_account'
      });

      if (loginResponse) {
        this.isAuthenticated = true;
        this.initializeGraphClient();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  }

  async logout() {
    try {
      await msalInstance.logoutPopup();
      this.isAuthenticated = false;
      this.graphClient = null;
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }
  private initializeGraphClient() {
    const activeAccount = msalInstance.getActiveAccount();
    if (!activeAccount) {
      throw new Error('No active account found');
    }

    const authProvider = new AuthCodeMSALBrowserAuthenticationProvider(msalInstance, {
      account: activeAccount,
      scopes: scopes,
      interactionType: InteractionType.Popup
    });

    this.graphClient = Client.initWithMiddleware({
      authProvider: authProvider
    });
  }

  async getCurrentUser() {
    if (!this.graphClient || !this.isAuthenticated) {
      throw new Error('Not authenticated');
    }

    try {
      const user = await this.graphClient.api('/me').get();
      return user;
    } catch (error) {
      console.error('Failed to get user:', error);
      throw error;
    }
  }

  async getRootFolders(): Promise<OneDriveItem[]> {
    if (!this.graphClient || !this.isAuthenticated) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await this.graphClient
        .api('/me/drive/root/children')
        .filter('folder ne null')
        .get();

      return response.value || [];
    } catch (error) {
      console.error('Failed to get root folders:', error);
      throw error;
    }
  }

  async getFolderContents(folderId: string): Promise<OneDriveItem[]> {
    if (!this.graphClient || !this.isAuthenticated) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await this.graphClient
        .api(`/me/drive/items/${folderId}/children`)
        .get();

      return response.value || [];
    } catch (error) {
      console.error('Failed to get folder contents:', error);
      throw error;
    }
  }

  async getImagesFromFolder(folderId: string): Promise<OneDriveImage[]> {
    if (!this.graphClient || !this.isAuthenticated) {
      throw new Error('Not authenticated');
    }

    try {
      // Get all items in the folder
      const response = await this.graphClient
        .api(`/me/drive/items/${folderId}/children`)
        .filter('file ne null')
        .get();

      const items: OneDriveItem[] = response.value || [];
      
      // Filter for image files
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
      const imageItems = items.filter(item => {
        if (!item.file) return false;
        const extension = item.name.toLowerCase().substring(item.name.lastIndexOf('.'));
        return imageExtensions.includes(extension);
      });

      // Convert to OneDriveImage format
      const images: OneDriveImage[] = [];
      for (const item of imageItems) {
        try {
          // Get download URL
          const downloadResponse = await this.graphClient
            .api(`/me/drive/items/${item.id}`)
            .select('@microsoft.graph.downloadUrl')
            .get();

          // Get thumbnail
          let thumbnailUrl: string | undefined;
          try {
            const thumbnailResponse = await this.graphClient
              .api(`/me/drive/items/${item.id}/thumbnails/0/medium`)
              .get();
            thumbnailUrl = thumbnailResponse.url;
          } catch (thumbnailError) {
            console.warn('Failed to get thumbnail for', item.name, thumbnailError);
          }

          images.push({
            id: item.id,
            name: item.name,
            src: downloadResponse['@microsoft.graph.downloadUrl'],
            alt: item.name,
            thumbnail: thumbnailUrl,
            webUrl: item.webUrl
          });
        } catch (error) {
          console.warn('Failed to process image:', item.name, error);
        }
      }

      return images;
    } catch (error) {
      console.error('Failed to get images from folder:', error);
      throw error;
    }
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated && this.graphClient !== null;
  }

  getActiveAccount() {
    return msalInstance.getActiveAccount();
  }
}

export const oneDriveAuthService = new OneDriveAuthService();
