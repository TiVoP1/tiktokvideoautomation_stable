//to samo co  brandingSettings
  
  const themes = [
    { 
      value: 'modern', 
      label: 'Modern',
      description: 'Clean, minimalist design',
      colors: ['#3B82F6', '#8B5CF6', '#EF4444'],
      bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #667eea 100%)', 
      text: '#fff',
      accent: '#3B82F6'
    },
    { 
      value: 'dark', 
      label: 'Dark',
      description: 'Sleek dark interface',
      colors: ['#1F2937', '#374151', '#6B7280'],
      bg: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)', 
      text: '#fff',
      accent: '#374151'
    },
    { 
      value: 'retro', 
      label: 'Retro',
      description: 'Vibrant 80s aesthetic',
      colors: ['#F59E0B', '#EF4444', '#8B5CF6'],
      bg: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 25%, #fecfef 75%, #ff9a9e 100%)', 
      text: '#1f2937',
      accent: '#F59E0B'
    },
    { 
      value: 'corporate', 
      label: 'Corporate',
      description: 'Professional business look',
      colors: ['#1E40AF', '#059669', '#DC2626'],
      bg: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #1e3c72 100%)', 
      text: '#fff',
      accent: '#1E40AF'
    }
  ];

export default themes;
