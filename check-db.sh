#!/bin/bash

echo "🔍 Database Connection Diagnostic Tool"
echo "======================================"
echo ""

# Check if .env file exists
echo "1️⃣ Checking .env file..."
if [ -f .env ]; then
    echo "✅ .env file exists"
    if grep -q "MONGODB_URI" .env; then
        echo "✅ MONGODB_URI found in .env"
        # Show masked connection string
        MONGODB_URI=$(grep MONGODB_URI .env | cut -d '=' -f2)
        echo "   Connection string: ${MONGODB_URI:0:20}...${MONGODB_URI: -10}"
    else
        echo "❌ MONGODB_URI not found in .env"
        echo "   Please add: MONGODB_URI=your_connection_string"
    fi
else
    echo "❌ .env file not found"
    echo "   Please create .env file with MONGODB_URI"
fi
echo ""

# Check if containers are running
echo "2️⃣ Checking Docker containers..."
if docker-compose ps | grep -q "hrms-app"; then
    echo "✅ Docker containers found"
    docker-compose ps
else
    echo "❌ No Docker containers running"
    echo "   Run: docker-compose up -d"
fi
echo ""

# Check environment variables in container
echo "3️⃣ Checking environment variables in container..."
if docker-compose ps | grep -q "hrms-app.*Up"; then
    echo "Container environment variables:"
    MONGODB_CHECK=$(docker-compose exec -T hrms-app env | grep "MONGODB_URI")
    if echo "$MONGODB_CHECK" | grep -q "dummy"; then
        echo "❌ MONGODB_URI contains 'dummy' - environment variables not loaded!"
        echo "   $MONGODB_CHECK"
        echo "   This means .env file is not being read properly"
    else
        echo "✅ MONGODB_URI is set (not showing full value for security)"
        echo "   ${MONGODB_CHECK:0:30}...${MONGODB_CHECK: -10}"
    fi
    docker-compose exec -T hrms-app env | grep -E "JWT_SECRET|NEXTAUTH" | sed 's/=.*/=***HIDDEN***/'
else
    echo "⚠️  Container not running, skipping..."
fi
echo ""

# Test MongoDB connection from container
echo "4️⃣ Testing MongoDB connection from container..."
if docker-compose ps | grep -q "hrms-app.*Up"; then
    docker-compose exec -T hrms-app node -e "
    const mongoose = require('mongoose');
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
        console.log('❌ MONGODB_URI not set in container');
        process.exit(1);
    }
    
    console.log('Attempting to connect to MongoDB...');
    mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
        .then(() => {
            console.log('✅ MongoDB connection successful!');
            console.log('   Database:', mongoose.connection.name);
            console.log('   Host:', mongoose.connection.host);
            process.exit(0);
        })
        .catch(err => {
            console.log('❌ MongoDB connection failed!');
            console.log('   Error:', err.message);
            process.exit(1);
        });
    " 2>&1
else
    echo "⚠️  Container not running, skipping..."
fi
echo ""

# Check container logs
echo "5️⃣ Recent container logs (last 20 lines)..."
if docker-compose ps | grep -q "hrms-app"; then
    docker-compose logs --tail=20 hrms-app
else
    echo "⚠️  Container not running, skipping..."
fi
echo ""

# Check if app is responding
echo "6️⃣ Testing application endpoint..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|301\|302"; then
    echo "✅ Application is responding"
else
    echo "❌ Application not responding on http://localhost:3000"
fi
echo ""

echo "======================================"
echo "Diagnostic complete!"
echo ""
echo "Common fixes:"
echo "1. Ensure .env file has correct MONGODB_URI"
echo "2. Restart containers: docker-compose down && docker-compose up -d"
echo "3. Check logs: docker-compose logs -f hrms-app"
echo "4. Verify MongoDB is accessible from the server"

