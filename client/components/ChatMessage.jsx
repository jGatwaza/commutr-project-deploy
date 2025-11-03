function ChatMessage({ content, isUser }) {
  return (
    <div className={`message ${isUser ? 'user' : 'agent'}`}>
      <div className="message-avatar">
        {isUser ? '👤' : (
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="24" cy="24" r="24" fill="#D9EEEE"/>
            <path d="M24 14C22.35 14 21 15.35 21 17V23C21 24.65 22.35 26 24 26C25.65 26 27 24.65 27 23V17C27 15.35 25.65 14 24 14Z" fill="#5F8A8B"/>
            <path d="M30 23C30 26.31 27.31 29 24 29C20.69 29 18 26.31 18 23H16C16 27.42 19.03 31.11 23 31.83V37H25V31.83C28.97 31.11 32 27.42 32 23H30Z" fill="#5F8A8B"/>
          </svg>
        )}
      </div>
      <div className="message-content">{content}</div>
    </div>
  );
}

export default ChatMessage;
