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
  'Files.ReadWrite',
  'User.Read',
  'Sites.Read.All'
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
      
      // Check if there's already an authenticated account
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        // Set the first account as active if no active account is set
        const activeAccount = msalInstance.getActiveAccount();
        if (!activeAccount) {
          msalInstance.setActiveAccount(accounts[0]);
        }
        
        // If we have an active account, try to initialize the graph client
        if (msalInstance.getActiveAccount()) {
          try {
            this.initializeGraphClient();
            this.isAuthenticated = true;
          } catch (error) {
            console.warn('Failed to initialize graph client with existing account:', error);
            // Clear the account if initialization fails
            msalInstance.setActiveAccount(null);
            this.isAuthenticated = false;
          }
        }
      }
      
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

      if (loginResponse && loginResponse.account) {
        // Set the active account
        msalInstance.setActiveAccount(loginResponse.account);
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
      const activeAccount = msalInstance.getActiveAccount();
      if (activeAccount) {
        await msalInstance.logoutPopup({
          account: activeAccount
        });
      }
      
      // Clear the active account
      msalInstance.setActiveAccount(null);
      this.isAuthenticated = false;
      this.graphClient = null;
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if logout fails, clear local state
      msalInstance.setActiveAccount(null);
      this.isAuthenticated = false;
      this.graphClient = null;
    }
  }private initializeGraphClient() {
    const activeAccount = msalInstance.getActiveAccount();
    if (!activeAccount) {
      const allAccounts = msalInstance.getAllAccounts();
      console.error('No active account found. All accounts:', allAccounts);
      throw new Error('No active account found. Please login again.');
    }

    console.log('Initializing Graph client with account:', activeAccount.username);

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
      console.log('Getting root folders');
      
      const response = await this.graphClient
        .api('/me/drive/root/children')
        .filter('folder ne null')
        .select('id,name,folder,webUrl,parentReference')
        .get();

      const folders = response.value || [];
      console.log(`Found ${folders.length} root folders`);
      return folders;
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
      console.log('Getting folder contents for ID:', folderId);
      
      const response = await this.graphClient
        .api(`/me/drive/items/${folderId}/children`)
        .select('id,name,folder,file,webUrl,parentReference,@microsoft.graph.downloadUrl')
        .get();      const items = response.value || [];
      console.log(`Found ${items.length} items in folder`);
      return items;
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
      console.log('Getting images from folder ID:', folderId);
      
      // First, verify we can access the folder
      let folderInfo;
      try {
        folderInfo = await this.graphClient
          .api(`/me/drive/items/${folderId}`)
          .get();
        console.log('Folder info:', folderInfo);
      } catch (folderError: any) {
        console.error('Failed to access folder by ID, trying alternative approach:', folderError);
        
        // If direct ID access fails, try to get images using search
        return await this.getImagesFromFolderBySearch(folderId);
      }

      // Get all items in the folder - try multiple approaches
      let response;
      try {
        // First approach: direct children API with select
        response = await this.graphClient
          .api(`/me/drive/items/${folderId}/children`)
          .select('id,name,file,webUrl,@microsoft.graph.downloadUrl')
          .get();
      } catch (childrenError: any) {
        console.error('Direct children API failed, trying alternative approach:', childrenError);
        return await this.getImagesFromFolderBySearch(folderId);
      }

      const items: OneDriveItem[] = response.value || [];
      console.log(`Found ${items.length} items in folder`);
      
      return await this.processImageItems(items);
    } catch (error) {
      console.error('Failed to get images from folder:', error);
      throw error;
    }
  }

  private async getImagesFromFolderBySearch(folderId: string): Promise<OneDriveImage[]> {
    try {
      console.log('Trying alternative search approach for folder:', folderId);
      
      // Get folder info first to get its path
      const folderInfo = await this.graphClient!
        .api(`/me/drive/items/${folderId}`)
        .select('name,parentReference')
        .get();

      // Search for images in the folder using the folder path
      const searchQuery = `*.jpg OR *.jpeg OR *.png OR *.gif OR *.bmp OR *.webp OR *.tiff OR *.svg`;
      const response = await this.graphClient!
        .api('/me/drive/search(q=\'' + searchQuery + '\')')
        .get();

      const allItems: OneDriveItem[] = response.value || [];
      console.log(`Search found ${allItems.length} total items`);

      // Filter items that belong to the target folder
      const folderPath = folderInfo.parentReference?.path ? 
        `${folderInfo.parentReference.path}/${folderInfo.name}` : 
        `/${folderInfo.name}`;
      
      const folderItems = allItems.filter(item => {
        if (!item.parentReference?.path) return false;
        return item.parentReference.path.includes(folderPath);
      });

      console.log(`Found ${folderItems.length} items in target folder via search`);
      
      return await this.processImageItems(folderItems);
    } catch (searchError: any) {
      console.error('Search approach also failed:', searchError);
      throw new Error(`Cannot access folder with ID: ${folderId}. Error: ${searchError?.message || String(searchError)}`);
    }
  }

  private async processImageItems(items: OneDriveItem[]): Promise<OneDriveImage[]> {
    // Filter for image files
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.svg'];
    const imageItems = items.filter(item => {
      if (!item.file) return false;
      const extension = item.name.toLowerCase().substring(item.name.lastIndexOf('.'));
      const isImage = imageExtensions.includes(extension);
      if (isImage) {
        console.log('Found image:', item.name, 'MIME type:', item.file.mimeType);
      }
      return isImage;
    });

    console.log(`Found ${imageItems.length} image files`);

    if (imageItems.length === 0) {
      console.warn('No image files found');
      return [];
    }

    // Convert to OneDriveImage format
    const images: OneDriveImage[] = [];
    for (const item of imageItems) {
      try {
        // For images, we can use the direct download URL from the item if available
        let downloadUrl = item['@microsoft.graph.downloadUrl'];
        
        if (!downloadUrl) {
          // Get download URL explicitly
          try {
            const downloadResponse = await this.graphClient!
              .api(`/me/drive/items/${item.id}`)
              .select('@microsoft.graph.downloadUrl')
              .get();
            downloadUrl = downloadResponse['@microsoft.graph.downloadUrl'];
          } catch (dlError) {
            console.warn('Failed to get download URL for', item.name, dlError);
            continue;
          }
        }

        if (!downloadUrl) {
          console.warn('No download URL available for', item.name);
          continue;
        }

        // Get thumbnail
        let thumbnailUrl: string | undefined;
        try {
          const thumbnailResponse = await this.graphClient!
            .api(`/me/drive/items/${item.id}/thumbnails/0/medium`)
            .get();
          thumbnailUrl = thumbnailResponse.url;
        } catch (thumbnailError) {
          console.warn('Failed to get thumbnail for', item.name, '- using main image');
          // Use the main image as thumbnail if thumbnail generation fails
          thumbnailUrl = downloadUrl;
        }

        images.push({
          id: item.id,
          name: item.name,
          src: downloadUrl,
          alt: item.name,
          thumbnail: thumbnailUrl,
          webUrl: item.webUrl
        });
      } catch (error) {
        console.warn('Failed to process image:', item.name, error);
      }
    }

    console.log(`Successfully processed ${images.length} images`);
    return images;
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated && this.graphClient !== null;
  }

  getActiveAccount() {
    return msalInstance.getActiveAccount();
  }
}

export const oneDriveAuthService = new OneDriveAuthService();
