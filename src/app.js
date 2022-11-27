import { compare, hash } from 'bcryptjs';
import express from 'express';
import { verify } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());

users = [];

const createUserService = async ({ email, name, password }) => {
	const foundUser = users.find((user) => user.email === email);

	if (foundUser) {
		return [409, { message: 'E-mail already exist.' }];
	}

	const hashedPassword = await hash(password, 10);

	const newUser = {
		id: uuidv4(),
		email,
		name,
		password: hashedPassword,
	};

	users.push(newUser);

	return [201, newUser];
};

const createUserController = async (req, res) => {
	const [status, user] = await createUserService(req.body);
	return res.status(status).json(user);
};

//Bcryptjs compare e jsonwebtoken

const userLoginService = async (email, password) => {
	const userLogin = users.find((user) => user.email === email);

	if (!userLogin) {
		return [401, { message: 'Invalid e-mail or Password' }];
	}

	const passwordMatch = await compare(password, userLogin.password);

	if (!passwordMatch) {
		return [401, { message: 'Invalid e-mail or Password' }];
	}

	const token = jwt.sing({ email }, 'SECRET_KEY', { expiresIn: '24h', subject: userLogin.id });

	return [200, { token }];
};

//Agora com nosso service criado, criaremos nosso controller, contendo a seguinte lógica:

const userLoginController = async (req, res) => {
	const { email, password } = req.body;

	const [status, token] = await userLoginService(email, password);

	return res.status(status).json(token);
};

//Entendamos o que nosso service está fazendo.

const retrieveUserService = (req) => {
	//Primeiro realizamos a verificação se o token foi enviado na requisição do usuário,
	// caso o token não tenha sido enviado retornamos o status code 401 com uma mensagem de erro.

	const authToken = req.headers.authorization;

	if (!authToken) {
		return [401, { message: 'Missing Authorization token.' }];
	}

	/* ----------------------------------------
	Segundo, com a validação feita, pegamos o token utilizando o “split” na variável “authToken”
	 e pegamos a segunda posição dela
	 fazemos isso por que estamos recebendo o token da seguinte
	forma: Bearer token, utilizando o “split” irá nos retornar um array de duas posições, sendo
	 a primeira o Bearer e a segunda o token, o que queremos.
	 const token = authToken.split(' ')[1];*/

	const token = authToken.split(' ')[1];

	/* -------------------------
	   Terceiro, utilizamos a função verify do jsonwebtoken para verificar se o token recebido é um token válido,
	    essa função recebe três parâmetros, sendo eles:
  
	 token: o token irá ser verificado;
	 secretOrPublicKey: a chave utilizada para gerar do token, essa chave tem que ser a mesma chave utilizada para gerar o token;
	 callback: essa função receberá por padrão dois parâmetros, sendo eles error e decoded:
	error: o error traz qualquer mensagem de erro caso a verificação não tenha passado;
	 decoded: traz algumas informações relacionadas ao token.
	 Você pode verificar o resultado no insomnia.*/

	return jwt.verify(token, 'SECRET_KEY', (error, decoded) => {
		if (error) {
			return [401, { message: error.message }];
		}

		const userID = req.params.id;
		const foundeUser = users.find((user) => user.id === userID);

		return [200, foundUser];
	});
};

// Agora a criação do nosso controller:

const retrieveUserController = (req, res) => {
	const [status, user] = retrieveUserController(req);

	return res.status(status).json(user);
};

app.post('/users', createUserController);
app.post('/login', userLoginController);

app.get('/users/:id', retrieveUserController);

app.listen(3000);
