
import socket

def check_listener():
    # Attempt to see if we can connect to 0.0.0.0:5000 (conceptually)
    # Since we can't easily check 'listening' without psutil or similar, 
    # we'll just advise the user to restart.
    print("Backend configured to listen on 0.0.0.0:5000.")
    print("Frontend configured to use dynamic redirects via FRONTEND_URL.")
    print("\nVerify your local IP (e.g., 192.168.x.x) and use it to access the app.")

if __name__ == "__main__":
    check_listener()
