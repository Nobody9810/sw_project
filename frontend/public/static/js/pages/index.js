// 问答板块的展开/收起功能
function toggleAnswer() {
  const qaSection = document.querySelector('.qa-section');
  const answer = document.getElementById('qaAnswer');
  const toggleIcon = document.querySelector('.toggle-icon');
  
  if (answer.style.display === 'none' || !answer.style.display) {
    answer.style.display = 'block';
    toggleIcon.style.transform = 'rotate(-90deg)';
    qaSection.classList.add('expanded');
  } else {
    answer.style.display = 'none';
    toggleIcon.style.transform = 'rotate(90deg)';
    qaSection.classList.remove('expanded');
  }
} 