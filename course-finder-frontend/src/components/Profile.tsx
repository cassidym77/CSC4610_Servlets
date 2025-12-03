import { useState, useEffect, SyntheticEvent } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { DataService } from "../services/DataService";
import { UserProfile } from "./model/model";
import './Profile.css';

interface ProfileProps {
  dataService: DataService;
}

type CustomEvent = {
  target: HTMLInputElement;
}

export default function Profile({ dataService }: ProfileProps) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [biography, setBiography] = useState<string>("");
  const [profilePicture, setProfilePicture] = useState<File | undefined>();
  const [profilePictureUrl, setProfilePictureUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [username, setUsername] = useState<string>('User');

  useEffect(() => {
    const loadProfile = async () => {
      if (!dataService.isAuthorized()) {
        setLoading(false);
        return;
      }
      try {
        // Get username
        const authService = (dataService as any).authService;
        if (authService) {
          const userName = authService.getUserName();
          if (userName) {
            setUsername(userName);
          }
        }
        
        const userProfile = await dataService.getUserProfile();
        if (userProfile) {
          setProfile(userProfile);
          setBiography(userProfile.biography || "");
          setProfilePictureUrl(userProfile.profilePictureUrl || "");
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [dataService]);

  const handleFileChange = (event: CustomEvent) => {
    if (event.target.files && event.target.files[0]) {
      setProfilePicture(event.target.files[0]);
      // Show preview
      const localUrl = URL.createObjectURL(event.target.files[0]);
      setProfilePictureUrl(localUrl);
    }
  };

  const handleSubmit = async (event: SyntheticEvent) => {
    event.preventDefault();
    if (!dataService.isAuthorized()) {
      setError("Please login to update your profile");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      let finalProfilePictureUrl: string | undefined = undefined;

      // Upload new profile picture if one was selected
      if (profilePicture) {
        try {
          finalProfilePictureUrl = await dataService.uploadProfilePicture(profilePicture);
        } catch (uploadErr: any) {
          throw new Error(`Failed to upload profile picture: ${uploadErr.message}`);
        }
      } else {
        // No new picture selected - preserve existing one
        if (profile && profile.profilePictureUrl) {
          // Use the existing profile picture URL from the database
          finalProfilePictureUrl = profile.profilePictureUrl;
        } else if (profilePictureUrl && !profilePictureUrl.startsWith('blob:')) {
          // Use the current state if it's not a blob URL
          finalProfilePictureUrl = profilePictureUrl;
        }
        // If profilePictureUrl is a blob URL and we don't have a saved one, 
        // finalProfilePictureUrl will be undefined, which means we won't update it
      }

      // Save profile
      await dataService.saveUserProfile(biography, finalProfilePictureUrl);
      
      setSuccess("Profile updated successfully!");
      setProfilePicture(undefined); // Clear file input
      
      // Small delay to ensure backend has processed the updates
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Reload profile to get updated data
      const updatedProfile = await dataService.getUserProfile();
      if (updatedProfile) {
        setProfile(updatedProfile);
        setBiography(updatedProfile.biography || "");
        // Use the server URL, not the blob preview
        if (updatedProfile.profilePictureUrl) {
          setProfilePictureUrl(updatedProfile.profilePictureUrl);
        } else if (finalProfilePictureUrl && !finalProfilePictureUrl.startsWith('blob:')) {
          setProfilePictureUrl(finalProfilePictureUrl);
        } else {
          setProfilePictureUrl("");
        }
      } else {
        // If profile doesn't exist yet, use what we just saved
        setBiography(biography);
        if (finalProfilePictureUrl && !finalProfilePictureUrl.startsWith('blob:')) {
          setProfilePictureUrl(finalProfilePictureUrl);
        } else if (profilePictureUrl && profilePictureUrl.startsWith('blob:')) {
          // Clear blob URL if we don't have a saved one
          setProfilePictureUrl("");
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to update profile. Please try again.");
      console.error("Error saving profile:", err);
    } finally {
      setSaving(false);
    }
  };

  if (!dataService.isAuthorized()) {
    return (
      <div className="profileContainer">
        <h1>Profile</h1>
        <p>Please <NavLink to="/login">login</NavLink> to view and edit your profile.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="profileContainer">
        <h1>Profile</h1>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="profileContainer">
      <h1>Profile</h1>
      
      <div className="profileSection">
        <h2>Profile Picture</h2>
        <div className="profilePictureSection">
          {profilePictureUrl && (
            <img 
              src={profilePictureUrl} 
              alt="Profile" 
              className="profilePicture"
            />
          )}
          {!profilePictureUrl && (
            <div className="profilePicturePlaceholder">
              <span>No profile picture</span>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="profileForm" noValidate>
        <div className="formGroup">
          <label>Username</label>
          <input 
            type="text" 
            value={username} 
            disabled 
            className="disabledInput"
          />
        </div>

        <div className="formGroup">
          <label>Biography</label>
          <textarea
            value={biography}
            onChange={(e) => setBiography(e.target.value)}
            placeholder="Write a short biography about yourself..."
            rows={6}
            className="biographyInput"
          />
        </div>

        <div className="formGroup">
          <label>Profile Picture</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e)}
            className="fileInput"
          />
          <small>Upload a new profile picture (JPG, PNG, etc.)</small>
        </div>

        {error && <div className="errorMessage">{error}</div>}
        {success && <div className="successMessage">{success}</div>}

        <button 
          type="submit" 
          disabled={saving}
          className="saveButton"
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>

      <div className="profileActions">
        <h2>Your Posts</h2>
        <button 
          onClick={() => navigate('/yourPosts')}
          className="viewPostsButton"
        >
          View Your Private Posts
        </button>
      </div>
    </div>
  );
}
