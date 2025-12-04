import './Home.css';

export default function Home() {
  return (
    <div className="homeContainer">
      <div className="homeHero">
        <h1>Welcome to PocketPost</h1>
        <p>The place to share your thoughts or keep them in your pocket.</p>
        <a href="/courses" className="ctaButton">Explore Posts</a>
      </div>
      
      <div className="homeFeatures">
        <div className="featureCard">
          <h3>📝 Create</h3>
          <p>Write and share your thoughts with the world, or keep them private for yourself.</p>
        </div>
        <div className="featureCard">
          <h3>🔍 Explore</h3>
          <p>Discover interesting posts from the community and engage with content you love.</p>
        </div>
        <div className="featureCard">
          <h3>💬 Connect</h3>
          <p>Comment on posts, vote on content, and build your profile to express yourself.</p>
        </div>
      </div>
    </div>
  );
}




