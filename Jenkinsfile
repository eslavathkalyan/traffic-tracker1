pipeline {
    agent any

    environment {
        FRONTEND_IMAGE = 'traffic-frontend'
        BACKEND_IMAGE  = 'traffic-backend'
    }

    stages {
        stage('Environment Info') {
            steps {
                script {
                    echo "--- Environment Configuration ---"
                    if (isUnix()) {
                        sh 'node --version'
                        sh 'npm --version'
                        sh 'docker --version'
                    } else {
                        bat 'node --version'
                        bat 'npm --version'
                        bat 'docker --version'
                    }
                }
            }
        }

        stage('Frontend - Install & Build') {
            steps {
                dir('frontend') {
                    script {
                        echo "--- Frontend: Installing Dependencies & Building React App ---"
                        if (isUnix()) {
                            sh 'npm install'
                            sh 'npm run build'
                        } else {
                            bat 'npm install'
                            bat 'npm run build'
                        }
                    }
                }
            }
        }

        stage('Backend - Install & Verify') {
            steps {
                dir('backend') {
                    script {
                        echo "--- Backend: Installing Dependencies & Verifying Syntax ---"
                        if (isUnix()) {
                            sh 'npm install'
                            sh 'node --check src/server.js'
                        } else {
                            bat 'npm install'
                            bat 'node --check src/server.js'
                        }
                    }
                }
            }
        }

        stage('Docker - Build Images') {
            steps {
                script {
                    echo "--- Docker: Building Images ---"
                    if (isUnix()) {
                        sh "docker build -t ${FRONTEND_IMAGE} ./frontend"
                        sh "docker build -t ${BACKEND_IMAGE} ./backend"
                    } else {
                        bat "docker build -t ${FRONTEND_IMAGE} ./frontend"
                        bat "docker build -t ${BACKEND_IMAGE} ./backend"
                    }
                }
            }
        }
    }

    post {
        always {
            echo "--- Clean-up and Finalization ---"
        }
        success {
            echo "Pipeline succeeded! Frontend and Backend Docker images were successfully built."
        }
        failure {
            echo "Pipeline failed. Please check stage logs for details."
        }
    }
}
