package com.omniprice;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {"spring.task.scheduling.enabled=false"})
class BackendSpringbootApplicationTests {

	@Test
	void contextLoads() {
	}

}
