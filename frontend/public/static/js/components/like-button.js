document.addEventListener('DOMContentLoaded', function() {
    const likeButtons = document.querySelectorAll('.like-btn');
    const dislikeButtons = document.querySelectorAll('.dislike-btn');
    
    if (likeButtons.length === 0 || dislikeButtons.length === 0) return;

    const csrfToken = document.querySelector('.like-dislike-container')?.dataset.csrfToken || 
                     document.querySelector('[name=csrfmiddlewaretoken]')?.value;
                     
    if (!csrfToken) return;

    function updateButtonStates(container, data) {
        console.log('Container:', container);
        
        const likeBtn = container.querySelector('.like-btn');
        const dislikeBtn = container.querySelector('.dislike-btn');
        const likeCount = likeBtn.querySelector('.count');
        const dislikeCount = dislikeBtn.querySelector('.count');

        console.log('Found elements:', {
            likeCount: likeCount,
            dislikeCount: dislikeCount,
            likeBtn: likeBtn,
            dislikeBtn: dislikeBtn
        });

        if (likeCount) {
            likeCount.classList.add('changing');
            likeCount.textContent = data.total_likes;
            setTimeout(() => likeCount.classList.remove('changing'), 300);
        }
        if (dislikeCount) {
            dislikeCount.classList.add('changing');
            dislikeCount.textContent = data.total_dislikes;
            setTimeout(() => dislikeCount.classList.remove('changing'), 300);
        }

        if (data.is_liked) {
            likeBtn.classList.add('active');
            dislikeBtn.classList.remove('active');
        } else if (data.is_disliked) {
            dislikeBtn.classList.add('active');
            likeBtn.classList.remove('active');
        } else {
            likeBtn.classList.remove('active');
            dislikeBtn.classList.remove('active');
        }
    }

    function handleLikeDislike(button, action) {
        if (button.disabled) return;
        
        const container = button.closest('.like-dislike-container');
        if (!container) {
            console.error('找不到容器元素');
            return;
        }

        button.disabled = true;
        
        const spinner = document.createElement('span');
        spinner.className = 'spinner-border spinner-border-sm';
        button.appendChild(spinner);
        
        const appLabel = button.getAttribute('data-app-label');
        const modelName = button.getAttribute('data-model-name');
        const itemId = button.getAttribute('data-item-id');

        if (!appLabel || !modelName || !itemId) {
            button.disabled = false;
            button.removeChild(spinner);
            return;
        }

        const url = `/api/${action}/${encodeURIComponent(appLabel)}/${encodeURIComponent(modelName)}/${itemId}/`;

        fetch(url, {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': csrfToken,
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin'
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(`HTTP error! status: ${response.status}, body: ${text}`);
                });
            }
            return response.json();
        })
        .then(data => {
            if (!data.success) {
                throw new Error(data.error || '未知错误');
            }
            
            console.log('Updating UI with data:', data);
            updateButtonStates(container, data);
        })
        .catch(error => {
            console.error('Error:', error);
            alert('操作失败: ' + error.message);
        })
        .finally(() => {
            button.disabled = false;
            if (spinner && spinner.parentNode === button) {
                button.removeChild(spinner);
            }
        });
    }

    likeButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            handleLikeDislike(this, 'like');
        });
    });

    dislikeButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            handleLikeDislike(this, 'dislike');
        });
    });
}); 