import React, { useState, useEffect, useRef } from 'react';
import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { bedrockClient, docClient, s3Client } from './aws-config';
import * as XLSX from 'xlsx';
import './Chatbot.css';

function Chatbot() {
  const [sliderValue, setSliderValue] = useState(3);
  const chatWindowRef = useRef(null);
  // Load initial state from localStorage or use defaults
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('chatbot-messages');
    return saved ? JSON.parse(saved) : [
      { text: "Hi! I'm your SRJC Pathways assistant. How can I help you today? TYPE 'explore pathways' to start our questionnaire and help me choose the pathway and career that's best for you", sender: 'bot'}
    ];
  });
  const [input, setInput] = useState('');

  const riasecLetters = ['A', 'A', 'E', 'R', 'R', 'I', 'C', 'I', 'S', 'E', 'C', 'I', 'R',]; // 'C', 'R', 'S', 'C', 'E', 'E', 'S'
  
  //change this to pull from s3
  const questions = [
    "On a scale of 1 to 5, with 1 being ‘Strongly Dislike’ and 5 being ‘Strongly Like,’ please rate the following statement: Do you enjoy writing, making music, or expressing yourself through art or media?",
    "On a scale of 1 to 5, with 1 being ‘Strongly Dislike’ and 5 being ‘Strongly Like,’ please rate the following statement: Do you enjoy designing logos, graphics, or visual layouts for digital or print media?",
    "On a scale of 1 to 5, with 1 being ‘Strongly Dislike’ and 5 being ‘Strongly Like,’ please rate the following statement: Would you enjoy writing fiction, poetry, or screenplays in your free time?",
    "On a scale of 1 to 5, with 1 being ‘Strongly Dislike’ and 5 being ‘Strongly Like,’ please rate the following statement: Do you like convincing others of your point of view or debating ideas?",
    "On a scale of 1 to 5, with 1 being ‘Strongly Dislike’ and 5 being ‘Strongly Like,’ please rate the following statement: Do you enjoy solving puzzles, riddles, or complex problems just for fun?",
    "On a scale of 1 to 5, with 1 being ‘Strongly Dislike’ and 5 being ‘Strongly Like,’ please rate the following statement: Do you enjoy performing in front of others—like music, dance, or theater?",
    "On a scale of 1 to 5, with 1 being ‘Strongly Dislike’ and 5 being ‘Strongly Like,’ please rate the following statement: Would you like to run or grow your own business one day?",
    "On a scale of 1 to 5, with 1 being ‘Strongly Dislike’ and 5 being ‘Strongly Like,’ please rate the following statement: Are you interested in marketing, selling, or promoting new ideas or products?",
    "On a scale of 1 to 5, with 1 being ‘Strongly Dislike’ and 5 being ‘Strongly Like,’ please rate the following statement: Are you interested in law, public safety, or advocating for others in legal situations?",
    "On a scale of 1 to 5, with 1 being ‘Strongly Dislike’ and 5 being ‘Strongly Like,’ please rate the following statement: Do you enjoy teaching, coaching, or guiding others to learn something new?",
    "On a scale of 1 to 5, with 1 being ‘Strongly Dislike’ and 5 being ‘Strongly Like,’ please rate the following statement: Do you like hands-on projects like building furniture, laying tile, or designing physical spaces?",
    "On a scale of 1 to 5, with 1 being ‘Strongly Dislike’ and 5 being ‘Strongly Like,’ please rate the following statement: Do you enjoy building, repairing, or operating tools and equipment?",
    "On a scale of 1 to 5, with 1 being ‘Strongly Dislike’ and 5 being ‘Strongly Like,’ please rate the following statement: Are you curious about programming, using computers, or working with technology?",
    // "On a scale of 1 to 5, with 1 being ‘Strongly Dislike’ and 5 being ‘Strongly Like,’ please rate the following statement: Do you prefer clerical tasks like sorting mail, keeping records, or proofreading documents?",
    // "On a scale of 1 to 5, with 1 being ‘Strongly Dislike’ and 5 being ‘Strongly Like,’ please rate the following statement: Are you interested in doing science experiments or figuring out how things in nature work?",
    // "On a scale of 1 to 5, with 1 being ‘Strongly Dislike’ and 5 being ‘Strongly Like,’ please rate the following statement: Do you like helping people solve emotional or personal problems?",
    // "On a scale of 1 to 5, with 1 being ‘Strongly Dislike’ and 5 being ‘Strongly Like,’ please rate the following statement: Do you like managing a business, leading teams, or making important decisions?",
    // "On a scale of 1 to 5, with 1 being ‘Strongly Dislike’ and 5 being ‘Strongly Like,’ please rate the following statement: Do you enjoy working with numbers, keeping records, or handling financial tasks?",
    // "On a scale of 1 to 5, with 1 being ‘Strongly Dislike’ and 5 being ‘Strongly Like,’ please rate the following statement: Would you enjoy working in a laboratory setting doing medical or scientific testing?",
    // "On a scale of 1 to 5, with 1 being ‘Strongly Dislike’ and 5 being ‘Strongly Like,’ please rate the following statement: Would you enjoy working outdoors, driving, or doing physical tasks like firefighting?",
    // "On a scale of 1 to 5, with 1 being ‘Strongly Dislike’ and 5 being ‘Strongly Like,’ please rate the following statement: Do you like organizing inventory or working in retail or warehouse environments?",
    // "On a scale of 1 to 5, with 1 being ‘Strongly Dislike’ and 5 being ‘Strongly Like,’ please rate the following statement: Are you interested in taking care of animals or protecting the environment?",
    // "On a scale of 1 to 5, with 1 being ‘Strongly Dislike’ and 5 being ‘Strongly Like,’ please rate the following statement: Do you enjoy giving advice, mentoring others, or offering guidance on life or careers?",
    // "On a scale of 1 to 5, with 1 being ‘Strongly Dislike’ and 5 being ‘Strongly Like,’ please rate the following statement: Do you like checking the quality of things or making sure products meet standards?"
  ];

  
  const [conversationHistory, setConversationHistory] = useState(() => {
    const saved = localStorage.getItem('chatbot-conversation-history');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(() => {
    const saved = localStorage.getItem('chatbot-question-index');
    return saved ? parseInt(saved) : 0;
  });
  const [isGuidedMode, setIsGuidedMode] = useState(() => {
    const saved = localStorage.getItem('chatbot-guided-mode');
    return saved ? JSON.parse(saved) : false;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [typingMessage, setTypingMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [pathwayData, setPathwayData] = useState([]);
  const [majorsData, setMajorsData] = useState([]);
  const [certificatesData, setCertificatesData] = useState([]);

  // Load CSV data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load pathway data
        const pathwayResponse = await fetch('/Pathway-Framework-Info.csv');
        const pathwayText = await pathwayResponse.text();
        const pathwayLines = pathwayText.split('\r\n').slice(1).filter(line => line.trim());
        const pathways = pathwayLines.map(line => {
          const cols = line.split(',');
          return { name: cols[0], riasec: cols[5] };
        });
        setPathwayData(pathways);
        console.log('Pathways loaded:', pathways);

        // Load majors data
        const majorsResponse = await fetch('/SRJC_Majors_HollandCoded.csv');
        const majorsText = await majorsResponse.text();
        const majorsLines = majorsText.split('\r\n').slice(1).filter(line => line.trim());
        const majors = majorsLines.map(line => {
          const cols = line.split(',');
          return { name: cols[0], riasec: cols[1] };
        });
        setMajorsData(majors);
        console.log('Majors loaded:', majors.length);

        // Load certificates data
        const certsResponse = await fetch('/SRJC_Certificates_HollandCoded.csv');
        const certsText = await certsResponse.text();
        const certsLines = certsText.split('\r\n').slice(1).filter(line => line.trim());
        const certificates = certsLines.map(line => {
          const cols = line.split(',');
          return { name: cols[0], riasec: cols[1] };
        });
        setCertificatesData(certificates);
        console.log('Certificates loaded:', certificates.length);
        
        console.log('All data loaded');
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, []);


  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]);

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('chatbot-messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('chatbot-conversation-history', JSON.stringify(conversationHistory));
  }, [conversationHistory]);

  useEffect(() => {
    localStorage.setItem('chatbot-question-index', currentQuestionIndex.toString());
  }, [currentQuestionIndex]);

  useEffect(() => {
    localStorage.setItem('chatbot-guided-mode', JSON.stringify(isGuidedMode));
  }, [isGuidedMode]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
  
    const userMessage = { text: input, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    const userInput = input;
    setInput('');
    setIsLoading(true);
  
    if (!isGuidedMode && userInput.toLowerCase().includes("explore pathways")) {
      // Trigger guided flow
      setIsGuidedMode(true);
      const firstQuestion = questions[0];
      setCurrentQuestionIndex(0);
      setMessages(prev => [...prev, { text: firstQuestion, sender: 'bot' }]);
      setIsLoading(false);
      return;
    }
  
    try {
      let prompt;
  
      if (isGuidedMode) {
        // In guided mode: collect history + build prompt with context
        const updatedHistory = [
          ...conversationHistory,
          {
            question: questions[currentQuestionIndex],
            answer: userInput
          }
        ];
        setConversationHistory(updatedHistory);
  
        const nextIndex = currentQuestionIndex + 1;
        const nextQuestion = questions[nextIndex];
  
        setCurrentQuestionIndex(nextIndex);
        
        // Update DynamoDB after each question
        const score = parseInt(userInput) || 0;
        const letter = riasecLetters[currentQuestionIndex];
        let userId = localStorage.getItem('userId');
        
        // Generate new incremental ID for each quiz attempt
        if (!userId || currentQuestionIndex === 0) {
          const timestamp = Date.now();
          userId = `quiz_${timestamp}`;
          localStorage.setItem('userId', userId);
        }
        
        try {
          await docClient.send(new UpdateCommand({
            TableName: 'SRJCPathwaysResponses',
            Key: { id: userId },
            UpdateExpression: 'ADD riasecScores.#letter :score SET #ts = :timestamp',
            ExpressionAttributeNames: { '#letter': letter, '#ts': 'timestamp' },
            ExpressionAttributeValues: { ':score': score, ':timestamp': new Date().toISOString() }
          }));
        } catch (dbError) {
          if (dbError.name === 'ValidationException') {
            // First question - create new record
            await docClient.send(new PutCommand({
              TableName: 'SRJCPathwaysResponses',
              Item: {
                id: userId,
                timestamp: new Date().toISOString(),
                riasecScores: { [letter]: score },
                score: ''
              }
            }));
          }
        }
  
        prompt = `You are a friendly career discovery assistant. You're guiding a student through career interest questions. After each answer, respond conversationally and warmly, then ask the next question from this list if one exists. Keep your tone supportive and brief.\n\nHere is the conversation so far:\n`;
  
        updatedHistory.forEach((item, i) => {
          prompt += `Q${i + 1}: ${item.question}\nUser: ${item.answer}\n`;
        });
  
        if (nextQuestion) {
          prompt += `Now respond to the user's last answer, then ask: "\n${nextQuestion}"`;
        } else {
          prompt += `Now respond to the user's last answer and wrap up the conversation briefly.`;
          
          // Get final scores and calculate top 3 RIASEC code
          try {
            const result = await docClient.send(new GetCommand({
              TableName: 'SRJCPathwaysResponses',
              Key: { id: userId }
            }));
            
            console.log('Retrieved data:', result.Item);
            const scores = result.Item?.riasecScores || {};
            console.log('Scores:', scores);
            
            const sortedLetters = Object.entries(scores)
              .map(([letter, value]) => [letter, typeof value === 'object' ? parseInt(value.N) : value])
              .sort(([,a], [,b]) => b - a)
              .slice(0, 3)
              .map(([letter]) => letter);
            
            const sortedScores = sortedLetters.join('');
            console.log('Final RIASEC Code:', sortedScores);
            
            // Match pathways, majors, and certificates
            const matchedPathways = sortedLetters.map(letter => {
              const pathway = pathwayData.find(p => p.riasec && p.riasec.includes(letter));
              return pathway ? pathway.name : `${letter} Pathway`;
            });
            
            const matchedMajors = majorsData.filter(major => 
              sortedLetters.some(letter => major.riasec && major.riasec.includes(letter))
            ).slice(0, 10); // Top 10
            
            const matchedCertificates = certificatesData.filter(cert => 
              sortedLetters.some(letter => cert.riasec && cert.riasec.includes(letter))
            ).slice(0, 10); // Top 10
            
            // Update only the score field, keep riasecScores intact
            await docClient.send(new UpdateCommand({
              TableName: 'SRJCPathwaysResponses',
              Key: { id: userId },
              UpdateExpression: 'SET score = :score, pathways = :pathways, #ts = :timestamp',
              ExpressionAttributeNames: { '#ts': 'timestamp' },
              ExpressionAttributeValues: { 
                ':score': sortedScores,
                ':pathways': matchedPathways,
                ':timestamp': new Date().toISOString()
              }
            }));
            
            // Add comprehensive results to the conversation
            const pathwayMessage = `Here are your results:

RIASEC Code: ${sortedScores}

🎯 Your Top 3 SRJC Pathways:
1. ${matchedPathways[0]}
2. ${matchedPathways[1]}
3. ${matchedPathways[2]}

🎓 Recommended Majors:
${matchedMajors.map((major, i) => `${i+1}. ${major.name}`).join('\n')}

📜 Recommended Certificates:
${matchedCertificates.map((cert, i) => `${i+1}. ${cert.name}`).join('\n')}

If you have a low confidence in this area, let me know and I'll lead you to some relevant academic support / sources`;
            setTimeout(() => {
              setMessages(prev => [...prev, { text: pathwayMessage, sender: 'bot' }]);
            }, 2000);
            
            // alert('Score stored: ' + sortedScores);

          } catch (dbError) {
            console.error('Final score calculation error:', dbError);
          }
          
          setIsGuidedMode(false); // End guided mode
        }
      } else {
        // Default (non-guided) use
        prompt = `You are a helpful assistant for Santa Rosa Junior College (SRJC) pathways. Help students with academic programs, career paths, and transfer planning. Keep responses concise and helpful.\n\nStudent question: ${userInput}\n\nResponse:`;
      }
  
      const command = new InvokeModelCommand({
        modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 300,
          messages: [
            {
              role: "user",
              content: prompt
            }
          ]
        })
      });
  
      const response = await bedrockClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const botText = responseBody.content[0].text;
  
      setIsLoading(false);
      setIsTyping(true);
      setTypingMessage('');
      
      // Typewriter effect
      for (let i = 0; i <= botText.length; i++) {
        setTimeout(() => {
          setTypingMessage(botText.slice(0, i));
          if (i === botText.length) {
            setTimeout(() => {
              setMessages(prev => [...prev, { text: botText, sender: 'bot' }]);
              setIsTyping(false);
              setTypingMessage('');
            }, 100);
          }
        }, i * 15);
      }
    } catch (error) {
      console.error('Bedrock error:', error);
      const errorResponse = {
        text: `Connection error: ${error.message || 'Unknown error'}. Check console for details.`,
        sender: 'bot'
      };
      setMessages(prev => [...prev, errorResponse]);
      setIsLoading(false);
    }
  };
  

  return (
    <div className="chatbot-container">
      <header className="chatbot-header">
        <h1>SRJC Pathways Assistant</h1>
        <p>Ask me about programs, careers, and transfer options</p>
      </header>

      <div className="chat-window" ref={chatWindowRef}>
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.sender}`}>
            <div className="message-bubble">
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message bot">
            <div className="message-bubble typing">
              <div className="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        {isTyping && (
          <div className="message bot">
            <div className="message-bubble">
              {typingMessage}<span className="cursor">|</span>
            </div>
          </div>
        )}
      </div>

      {!isGuidedMode && (
        <div className="quick-actions">
          <button 
            onClick={() => {
              setIsGuidedMode(true);
              const firstQuestion = questions[0];
              setCurrentQuestionIndex(0);
              setMessages(prev => [...prev, { text: firstQuestion, sender: 'bot' }]);
            }}
            className="explore-button"
          >
            🎓 Explore Pathways
          </button>
        </div>
      )}

      {isGuidedMode && (
        <div className="slider-section">
          <div className="slider-container">
            <div className="slider-track">
              <div className="slider-numbers">
                <span className={sliderValue == 1 ? 'active' : ''}>1</span>
                <span className={sliderValue == 2 ? 'active' : ''}>2</span>
                <span className={sliderValue == 3 ? 'active' : ''}>3</span>
                <span className={sliderValue == 4 ? 'active' : ''}>4</span>
                <span className={sliderValue == 5 ? 'active' : ''}>5</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={sliderValue}
                onChange={(e) => setSliderValue(e.target.value)}
                onMouseUp={() => { setInput(sliderValue.toString()); sendMessage(); }}
                className="rating-slider"
              />
              <div className="slider-ticks">
                <div className="tick"></div>
                <div className="tick"></div>
                <div className="tick"></div>
                <div className="tick"></div>
                <div className="tick"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="input-container">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Ask about SRJC programs..."
          className="chat-input"
        />
        {isGuidedMode && (
          <button onClick={() => { setInput(sliderValue.toString()); sendMessage(); }} className="slider-submit-button">
            Use {sliderValue}
          </button>
        )}
        <button onClick={sendMessage} className="send-button">
          Send
        </button>
        <button 
          onClick={() => {
            localStorage.removeItem('chatbot-messages');
            localStorage.removeItem('chatbot-conversation-history');
            localStorage.removeItem('chatbot-question-index');
            localStorage.removeItem('chatbot-guided-mode');
            localStorage.removeItem('userId'); // Clear user ID for new quiz
            setMessages([{ text: "Hi! I'm your SRJC Pathways assistant. How can I help you today? TYPE 'explore pathways' to start our questionnaire and help me choose the pathway and career that's best for you", sender: 'bot' }]);
            setConversationHistory([]);
            setCurrentQuestionIndex(0);
            setIsGuidedMode(false);
          }}
          className="clear-button"
        >
          Start Over
        </button>
      </div>
    </div>
  );
}

export default Chatbot;